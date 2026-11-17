import type { AttendanceRepository, AuditRepository, EventRepository, ShiftRepository, SettingsRepository } from "@/repositories/contracts";
import type { AttendanceIncident, AttendancePunch, AttendanceSession, BreakRecord, CompanySettings, LocationSnapshot, Shift } from "@/types";
import { INCIDENT_LABELS } from "@/types";
import { attendanceSessionId } from "@/lib/firebase/collections";
import { AppError } from "@/utils/errors";
import { minutesBetween } from "@/utils/dates";
import {
  ACTION_LABELS,
  checkInWindow,
  computeWorkedMinutes,
  evaluateLocation,
  isActionAllowed,
  lateIncident,
  type AttendanceAction,
  type LocationEvaluation,
  type PositionReading,
} from "./domain/attendance-rules";
import { notificationTemplates } from "./notification.service";
import { getCurrentSession, requireActor, requireAdmin, requireEmployeeId } from "./session";
import type { Assignment } from "@/types";

/**
 * Valida la ubicación de un fichaje.
 * v1 (Spark): ClientLocationValidator — cálculo en el navegador. NO es prueba de autenticidad:
 * un usuario con conocimientos puede falsear la geolocalización o manipular la petición.
 * Futuro: ServerLocationValidator — un endpoint/Cloud Function recalcula distancia, sella hora y
 * escribe el registro con privilegios; las reglas dejarían de permitir escritura directa.
 */
export interface AttendanceLocationValidator {
  readonly source: "client" | "server";
  evaluate(input: {
    reading: PositionReading | null;
    readingError: string | null;
    target: LocationSnapshot;
    settings: CompanySettings;
    action: AttendanceAction;
  }): Promise<LocationEvaluation>;
}

export class ClientLocationValidator implements AttendanceLocationValidator {
  readonly source = "client" as const;
  async evaluate(input: Parameters<AttendanceLocationValidator["evaluate"]>[0]): Promise<LocationEvaluation> {
    return evaluateLocation({
      reading: input.reading,
      readingError: input.readingError,
      target: input.target,
      maxAccuracyMeters: input.settings.maxAccuracyMeters,
      stage: input.action,
      now: new Date(),
    });
  }
}

export interface ClockContext {
  assignment: Assignment;
  shift: Shift;
  target: LocationSnapshot;
  session: AttendanceSession | null;
  openBreak: BreakRecord | null;
  window: { opensAt: Date; closesAt: Date };
}

export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly shifts: ShiftRepository,
    private readonly events: EventRepository,
    private readonly settings: SettingsRepository,
    private readonly audit: AuditRepository,
    private readonly validator: AttendanceLocationValidator = new ClientLocationValidator(),
  ) {}

  get validationSource() {
    return this.validator.source;
  }

  async loadSettings(): Promise<CompanySettings> {
    return this.settings.get();
  }

  /** Prepara el contexto de fichaje de una asignación confirmada. */
  async context(assignment: Assignment, settings: CompanySettings): Promise<ClockContext> {
    requireEmployeeId();
    const shift = await this.shifts.getById(assignment.shiftId);
    if (!shift) throw new AppError("No se puede acceder al turno.");
    let target = shift.location;
    if (!target) {
      const event = await this.events.getById(shift.eventId);
      if (!event) throw new AppError("No se puede acceder al evento.");
      target = event.location;
    }
    const session = await this.repo.getSession(attendanceSessionId(shift.id, assignment.employeeId));
    const openBreak =
      session && session.status === "on_break"
        ? ((await this.repo.listBreaks(session)).find((b) => b.end == null) ?? null)
        : null;
    return {
      assignment,
      shift,
      target,
      session,
      openBreak,
      window: checkInWindow(shift.startAt, shift.endAt, settings.checkInEarlyMinutes),
    };
  }

  async evaluate(ctx: ClockContext, action: AttendanceAction, reading: PositionReading | null, readingError: string | null, settings: CompanySettings) {
    return this.validator.evaluate({ reading, readingError, target: ctx.target, settings, action });
  }

  /**
   * Registra una acción de fichaje. Valida la secuencia (máquina de estados) antes de escribir;
   * las reglas de Firestore vuelven a validar la secuencia y fuerzan la hora del servidor.
   */
  async punch(ctx: ClockContext, action: AttendanceAction, evaluation: LocationEvaluation): Promise<void> {
    const actor = requireActor();
    const employeeId = requireEmployeeId();
    const status = ctx.session?.status ?? null;
    if (!isActionAllowed(status, action)) {
      throw new AppError(`No puedes registrar "${ACTION_LABELS[action]}" en el estado actual.`);
    }
    const now = new Date();
    const punch: AttendancePunch = {
      clientAt: now,
      serverAt: null,
      coords: evaluation.coords,
      accuracyMeters: evaluation.accuracyMeters,
      distanceMeters: evaluation.distanceMeters,
      withinRadius: evaluation.withinRadius,
      validation: this.validator.source,
    };
    const incidents: AttendanceIncident[] = [...evaluation.incidents];
    const name = getCurrentSession()?.profile?.displayName ?? ctx.assignment.employeeName;

    switch (action) {
      case "check_in": {
        if (now < ctx.window.opensAt) throw new AppError("Todavía no se ha abierto el fichaje de este turno.");
        if (now > ctx.window.closesAt) throw new AppError("El turno ya ha terminado; no se puede fichar la entrada.");
        if (ctx.assignment.status !== "confirmed") throw new AppError("Solo puedes fichar en turnos confirmados.");
        const late = lateIncident(ctx.shift.startAt, now);
        if (late) incidents.push(late);
        await this.repo.checkIn({
          session: {
            shiftId: ctx.shift.id,
            eventId: ctx.shift.eventId,
            employeeId,
            userId: actor.uid,
            employeeName: ctx.assignment.employeeName,
            eventName: ctx.assignment.eventName,
            shiftName: ctx.assignment.shiftName,
            shiftStartAt: ctx.assignment.shiftStartAt,
            shiftEndAt: ctx.assignment.shiftEndAt,
            status: "open",
            checkIn: punch,
            checkOut: null,
            breakCount: 0,
            totalBreakMinutes: 0,
            workedMinutes: null,
            incidents,
            hasIncident: incidents.length > 0,
            adminNote: "",
          },
          notification: this.incidentNotification(name, ctx, incidents),
        });
        break;
      }
      case "break_start":
        await this.repo.startBreak(ctx.session!, punch, incidents, this.incidentNotification(name, ctx, incidents));
        break;
      case "break_end": {
        if (!ctx.openBreak) throw new AppError("No hay ninguna pausa abierta.");
        const startedAt = ctx.openBreak.start.serverAt ?? ctx.openBreak.start.clientAt;
        await this.repo.endBreak(ctx.session!, ctx.openBreak, punch, minutesBetween(startedAt, now), incidents, this.incidentNotification(name, ctx, incidents));
        break;
      }
      case "check_out": {
        const s = ctx.session!;
        const startedAt = s.checkIn.serverAt ?? s.checkIn.clientAt;
        const worked = computeWorkedMinutes(startedAt, now, s.totalBreakMinutes);
        await this.repo.checkOut(s, punch, worked, incidents, this.incidentNotification(name, ctx, incidents));
        break;
      }
    }
    await this.audit
      .log({ action: `attendance.${action}`, entityType: "attendance", entityId: attendanceSessionId(ctx.shift.id, employeeId), summary: ACTION_LABELS[action] }, actor)
      .catch(() => undefined);
  }

  private incidentNotification(name: string, ctx: ClockContext, incidents: AttendanceIncident[]) {
    if (incidents.length === 0) return null;
    const detail = incidents.map((i) => `${INCIDENT_LABELS[i.type]} (${i.message})`).join("; ");
    return notificationTemplates.attendanceIncident(name, `${ctx.assignment.eventName} · ${ctx.assignment.shiftName}`, detail);
  }

  async mySessions(): Promise<AttendanceSession[]> {
    const actor = requireActor();
    return this.repo.listSessionsByUser(actor.uid);
  }

  async breaksOf(session: AttendanceSession): Promise<BreakRecord[]> {
    requireActor();
    return this.repo.listBreaks(session);
  }

  // ---- Administración
  listRange(from: Date, to: Date): Promise<AttendanceSession[]> {
    requireAdmin();
    return this.repo.listSessionsInRange(from, to);
  }

  listOpen(): Promise<AttendanceSession[]> {
    requireAdmin();
    return this.repo.listOpenSessions();
  }

  /** Cierra una jornada incompleta indicando la hora de salida real comunicada. */
  async adminClose(session: AttendanceSession, checkOutAt: Date, note: string): Promise<void> {
    const actor = requireAdmin();
    if (session.status === "closed") throw new AppError("La jornada ya está cerrada.");
    const startedAt = session.checkIn.serverAt ?? session.checkIn.clientAt;
    if (checkOutAt <= startedAt) throw new AppError("La salida debe ser posterior a la entrada.");
    if (note.trim().length < 3) throw new AppError("Indica el motivo del cierre manual.");
    const worked = computeWorkedMinutes(startedAt, checkOutAt, session.totalBreakMinutes);
    await this.repo.adminClose(session, {
      checkOutAt,
      workedMinutes: worked,
      note: note.trim(),
      incidents: [{ type: "missing_check_out", stage: "check_out", message: "Salida registrada por administración.", at: new Date() }],
    });
    await this.audit.log({ action: "attendance.admin_close", entityType: "attendance", entityId: session.id, summary: note.trim() }, actor);
  }
}
