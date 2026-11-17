/**
 * Reglas de negocio puras de asignaciones (sin dependencias de Firebase ni de React).
 * Se pueden ejecutar tanto en el cliente como, en el futuro, en un backend.
 */
import type { Assignment, AssignmentConflict, AssignmentStatus, ShiftStatus } from "../../types";
import { intervalsOverlap } from "../../utils/dates";

export const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = ["pending", "confirmed"];

export function isActiveAssignment(a: Pick<Assignment, "status">): boolean {
  return ACTIVE_ASSIGNMENT_STATUSES.includes(a.status);
}

export function computeShiftStatus(current: ShiftStatus, confirmedCount: number, required: number): ShiftStatus {
  if (current === "cancelled") return "cancelled";
  if (confirmedCount <= 0) return "open";
  return confirmedCount >= required ? "filled" : "partially_filled";
}

export interface ShiftProjection {
  staffEmployeeIds: string[];
  confirmedEmployeeIds: string[];
}

/** Recalcula las listas de personal del turno tras cambiar el estado de una asignación. */
export function projectShiftMembership(
  current: ShiftProjection,
  employeeId: string,
  nextStatus: AssignmentStatus,
): ShiftProjection {
  const staff = new Set(current.staffEmployeeIds);
  const confirmed = new Set(current.confirmedEmployeeIds);
  if (nextStatus === "cancelled") {
    staff.delete(employeeId);
    confirmed.delete(employeeId);
  } else {
    staff.add(employeeId);
    if (nextStatus === "confirmed") confirmed.add(employeeId);
    else confirmed.delete(employeeId);
  }
  return { staffEmployeeIds: [...staff].sort(), confirmedEmployeeIds: [...confirmed].sort() };
}

export function projectEventStaff(
  current: string[],
  employeeId: string,
  nextStatus: AssignmentStatus,
  employeeHasOtherShiftsInEvent: boolean,
): string[] {
  const staff = new Set(current);
  if (nextStatus === "cancelled" && !employeeHasOtherShiftsInEvent) staff.delete(employeeId);
  if (nextStatus !== "cancelled") staff.add(employeeId);
  return [...staff].sort();
}

/** Detecta turnos activos del empleado que se solapan con el intervalo indicado. */
export function findConflicts(
  existing: Assignment[],
  interval: { startAt: Date; endAt: Date },
  excludeShiftId: string,
): AssignmentConflict[] {
  return existing
    .filter((a) => isActiveAssignment(a) && a.shiftId !== excludeShiftId)
    .filter((a) => intervalsOverlap(a.shiftStartAt, a.shiftEndAt, interval.startAt, interval.endAt))
    .map((a) => ({
      assignmentId: a.id,
      shiftId: a.shiftId,
      eventName: a.eventName,
      shiftName: a.shiftName,
      startAt: a.shiftStartAt,
      endAt: a.shiftEndAt,
    }));
}

const TRANSITIONS: Record<AssignmentStatus | "none", AssignmentStatus[]> = {
  none: ["pending", "confirmed"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "cancelled"],
  cancelled: ["pending", "confirmed"],
};

export function canTransition(from: AssignmentStatus | null, to: AssignmentStatus): boolean {
  return TRANSITIONS[from ?? "none"].includes(to);
}
