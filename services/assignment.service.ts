import type { AssignmentRepository, AuditRepository, AvailabilityRepository, EmployeeRepository, ShiftRepository } from "@/repositories/contracts";
import type { Assignment, AssignmentConflict, AssignmentStatus, Employee, Shift, WeeklyAvailability } from "@/types";
import { employeeFullName } from "@/types";
import { AppError } from "@/utils/errors";
import { toISODate, weekStartISO } from "@/utils/dates";
import { canTransition, findConflicts, isActiveAssignment } from "./domain/assignment-rules";
import { matchShiftAvailability, type AvailabilityMatch } from "./domain/availability-rules";
import { notificationTemplates } from "./notification.service";
import { shiftWhen } from "./shift.service";
import { requireAdmin, requireEmployeeId } from "./session";

export interface CandidateInfo {
  employee: Employee;
  assignment: Assignment | null;
  availability: AvailabilityMatch;
  conflicts: AssignmentConflict[];
}

/**
 * Gestiona asignaciones manuales.
 * En Spark la validación de solapes se ejecuta en el navegador del administrador antes de
 * la transacción. Preparado para delegar en un endpoint transaccional de servidor.
 */
export class AssignmentService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly shifts: ShiftRepository,
    private readonly employees: EmployeeRepository,
    private readonly availability: AvailabilityRepository,
    private readonly audit: AuditRepository,
  ) {}

  listByShift(shiftId: string): Promise<Assignment[]> {
    requireAdmin();
    return this.assignments.listByShift(shiftId);
  }

  listInRange(from: Date, to: Date): Promise<Assignment[]> {
    requireAdmin();
    return this.assignments.listInRange(from, to);
  }

  /** Información para decidir: disponibilidad declarada, solapes y estado actual de cada candidato. */
  async candidates(shift: Shift): Promise<CandidateInfo[]> {
    requireAdmin();
    const weekStart = weekStartISO(toISODate(shift.startAt));
    const [employees, current, weekAvailability] = await Promise.all([
      this.employees.list(),
      this.assignments.listByShift(shift.id),
      this.availability.listByWeek(weekStart),
    ]);
    const availabilityByEmployee = new Map<string, WeeklyAvailability>(weekAvailability.map((w) => [w.employeeId, w]));
    const active = employees.filter((e) => e.status === "active" || current.some((a) => a.employeeId === e.id && isActiveAssignment(a)));
    const result: CandidateInfo[] = [];
    // Consultas de solapes por candidato (consulta indexada employeeId + shiftEndAt).
    const overlapLists = await Promise.all(
      active.map((e) => this.assignments.listByEmployeeEndingAfter(e.id, shift.startAt)),
    );
    active.forEach((employee, i) => {
      result.push({
        employee,
        assignment: current.find((a) => a.employeeId === employee.id) ?? null,
        availability: matchShiftAvailability(shift, availabilityByEmployee.get(employee.id) ?? null),
        conflicts: findConflicts(overlapLists[i] ?? [], shift, shift.id),
      });
    });
    const rank: Record<AvailabilityMatch, number> = { available: 0, partial_match: 1, unknown: 2, outside_slots: 3, unavailable: 4 };
    return result.sort(
      (a, b) =>
        Number(b.assignment != null && isActiveAssignment(b.assignment)) - Number(a.assignment != null && isActiveAssignment(a.assignment)) ||
        a.conflicts.length - b.conflicts.length ||
        rank[a.availability] - rank[b.availability] ||
        employeeFullName(a.employee).localeCompare(employeeFullName(b.employee), "es"),
    );
  }

  async setStatus(shift: Shift, employee: Employee, nextStatus: AssignmentStatus, reason = ""): Promise<void> {
    const actor = requireAdmin();
    if (shift.status === "cancelled") throw new AppError("El turno está cancelado.");
    const current = await this.assignments.getById(`${shift.id}_${employee.id}`);
    if (!canTransition(current?.status ?? null, nextStatus)) {
      throw new AppError("Ese cambio de estado no está permitido.");
    }
    if (nextStatus !== "cancelled") {
      if (employee.status !== "active") throw new AppError("No se puede asignar a un trabajador inactivo.");
      const others = await this.assignments.listByEmployeeEndingAfter(employee.id, shift.startAt);
      const conflicts = findConflicts(others, shift, shift.id);
      if (conflicts.length > 0) {
        const c = conflicts[0]!;
        throw new AppError(
          `Incompatibilidad horaria: ${employeeFullName(employee)} ya está en "${c.eventName} · ${c.shiftName}" (${shiftWhen({ startAt: c.startAt, endAt: c.endAt })}).`,
        );
      }
    }
    const eventAssignments = (await this.assignments.listByEmployee(employee.id)).filter(
      (a) => a.eventId === shift.eventId && a.shiftId !== shift.id && isActiveAssignment(a),
    );
    const name = employeeFullName(employee);
    const when = shiftWhen(shift);
    let notification = null;
    if (nextStatus === "cancelled" && current && isActiveAssignment(current)) {
      notification = notificationTemplates.assignmentCancelled(employee.id, shift.eventName, when, reason);
    } else if (nextStatus === "pending" && current?.status !== "pending") {
      notification = notificationTemplates.assignmentNew(employee.id, shift.eventName, when, false);
    } else if (nextStatus === "confirmed") {
      notification = notificationTemplates.assignmentNew(employee.id, shift.eventName, when, true);
    }
    await this.assignments.applyMutation(
      {
        shiftId: shift.id,
        employeeId: employee.id,
        employeeName: name,
        employeePosition: employee.position,
        nextStatus,
        cancelledReason: reason,
        employeeHasOtherShiftsInEvent: eventAssignments.length > 0,
        notification,
      },
      actor,
    );
    await this.audit.log(
      { action: `assignment.${nextStatus}`, entityType: "assignment", entityId: `${shift.id}_${employee.id}`, summary: `${name} · ${shift.eventName} · ${shift.name}` },
      actor,
    );
  }

  // ---- Portal del trabajador
  async listMine(): Promise<Assignment[]> {
    return this.assignments.listByEmployee(requireEmployeeId());
  }

  async getMyShift(shiftId: string): Promise<Shift | null> {
    requireEmployeeId();
    return this.shifts.getById(shiftId);
  }
}
