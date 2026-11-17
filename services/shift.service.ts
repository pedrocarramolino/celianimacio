import type { AssignmentRepository, AuditRepository, EventRepository, ShiftInput, ShiftRepository } from "@/repositories/contracts";
import type { CompanyEvent, Shift, ShiftTeam } from "@/types";
import { shiftSchema, type ShiftFormValues } from "@/schemas/shift";
import { buildShiftInterval, formatDateTime, formatTime, toClockTime, weekDaysISO } from "@/utils/dates";
import { AppError } from "@/utils/errors";
import { computeShiftStatus, findConflicts, isActiveAssignment } from "./domain/assignment-rules";
import { snapshotFromForm } from "./event.service";
import { notificationTemplates } from "./notification.service";
import { requireActor, requireAdmin } from "./session";

export function shiftWhen(s: Pick<Shift, "startAt" | "endAt">): string {
  return `${formatDateTime(s.startAt)} – ${formatTime(s.endAt)}`;
}

export function shiftToForm(s: Shift): ShiftFormValues {
  return {
    name: s.name,
    date: s.date,
    startTime: toClockTime(s.startAt),
    endTime: toClockTime(s.endAt),
    requiredWorkers: String(s.requiredWorkers),
    position: s.position,
    instructions: s.instructions,
    useEventLocation: s.location == null,
    locationName: s.location?.name ?? "",
    address: s.location?.address ?? "",
    lat: s.location ? String(s.location.lat) : "",
    lng: s.location ? String(s.location.lng) : "",
    radiusMeters: s.location ? String(s.location.radiusMeters) : "",
  };
}

function formToInput(values: ShiftFormValues): ShiftInput {
  const v = shiftSchema.parse(values);
  const { startAt, endAt } = buildShiftInterval(v.date, v.startTime, v.endTime);
  return {
    name: v.name,
    date: v.date,
    startAt,
    endAt,
    requiredWorkers: Number(v.requiredWorkers),
    position: v.position,
    instructions: v.instructions,
    location: v.useEventLocation ? null : snapshotFromForm(v),
  };
}

export class ShiftService {
  constructor(
    private readonly shifts: ShiftRepository,
    private readonly events: EventRepository,
    private readonly assignments: AssignmentRepository,
    private readonly audit: AuditRepository,
  ) {}

  async get(id: string): Promise<Shift> {
    requireActor();
    const s = await this.shifts.getById(id);
    if (!s) throw new AppError("Turno no encontrado.", "not-found");
    return s;
  }

  listByEvent(eventId: string): Promise<Shift[]> {
    requireAdmin();
    return this.shifts.listByEvent(eventId);
  }

  listWeek(weekStart: string): Promise<Shift[]> {
    requireAdmin();
    const days = weekDaysISO(weekStart);
    return this.shifts.listByDateRange(days[0]!, days[6]!);
  }

  listRange(from: string, to: string): Promise<Shift[]> {
    requireAdmin();
    return this.shifts.listByDateRange(from, to);
  }

  async create(event: CompanyEvent, values: ShiftFormValues): Promise<string> {
    const actor = requireAdmin();
    if (event.status === "cancelled") throw new AppError("No se pueden añadir turnos a un evento cancelado.");
    const input = formToInput(values);
    const id = await this.shifts.create(event, input, "open", actor);
    await this.audit.log({ action: "shift.created", entityType: "shift", entityId: id, summary: `${event.name} · ${input.name}` }, actor);
    return id;
  }

  /**
   * Edita un turno. Si cambia el horario, comprueba que ningún trabajador asignado quede con
   * turnos solapados, propaga las horas a las asignaciones y avisa a los afectados.
   */
  async update(shift: Shift, values: ShiftFormValues): Promise<void> {
    const actor = requireAdmin();
    if (shift.status === "cancelled") throw new AppError("No se puede editar un turno cancelado.");
    const input = formToInput(values);
    const active = (await this.assignments.listByShift(shift.id)).filter(isActiveAssignment);
    const timeChanged = input.startAt.getTime() !== shift.startAt.getTime() || input.endAt.getTime() !== shift.endAt.getTime();

    if (timeChanged) {
      for (const a of active) {
        const others = await this.assignments.listByEmployeeEndingAfter(a.employeeId, input.startAt);
        const conflicts = findConflicts(others, input, shift.id);
        if (conflicts.length > 0) {
          throw new AppError(
            `${a.employeeName} tendría un solape con "${conflicts[0]!.eventName} · ${conflicts[0]!.shiftName}". Cancela esa asignación antes de cambiar el horario.`,
          );
        }
      }
    }
    const confirmed = active.filter((a) => a.status === "confirmed").length;
    if (confirmed > input.requiredWorkers) {
      throw new AppError(`Hay ${confirmed} trabajadores confirmados; no puedes reducir las plazas por debajo de ese número.`);
    }
    const status = computeShiftStatus(shift.status, confirmed, input.requiredWorkers);
    const notifications = timeChanged
      ? active.map((a) => notificationTemplates.scheduleChanged(a.employeeId, shift.eventName, shiftWhen(input)))
      : [];
    await this.shifts.update(shift, input, status, active, notifications, actor);
    await this.audit.log({ action: "shift.updated", entityType: "shift", entityId: shift.id, summary: `${shift.eventName} · ${input.name}` }, actor);
  }

  async cancel(shift: Shift, reason: string): Promise<void> {
    const actor = requireAdmin();
    if (shift.status === "cancelled") throw new AppError("El turno ya está cancelado.");
    const event = await this.events.getById(shift.eventId);
    if (!event) throw new AppError("Evento no encontrado.");
    const [active, eventAssignments] = await Promise.all([
      this.assignments.listByShift(shift.id).then((l) => l.filter(isActiveAssignment)),
      this.assignments.listByEvent(shift.eventId),
    ]);
    const nextEventStaff = [
      ...new Set(eventAssignments.filter((a) => isActiveAssignment(a) && a.shiftId !== shift.id).map((a) => a.employeeId)),
    ].sort();
    const notifications = active.map((a) =>
      notificationTemplates.assignmentCancelled(a.employeeId, shift.eventName, shiftWhen(shift), reason || "Turno cancelado"),
    );
    await this.shifts.cancel({ shift, event, activeAssignments: active, reason, nextEventStaffEmployeeIds: nextEventStaff, notifications }, actor);
    await this.audit.log({ action: "shift.cancelled", entityType: "shift", entityId: shift.id, summary: `${shift.eventName} · ${shift.name}` }, actor);
  }

  /** Compañeros confirmados del turno (solo nombres). */
  async team(shiftId: string): Promise<ShiftTeam | null> {
    requireActor();
    return this.shifts.getTeam(shiftId);
  }
}
