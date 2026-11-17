import type { ClockTime, EntityId, ISODate } from "./common";

export const DAY_AVAILABILITY_STATUSES = ["unset", "available", "partial", "unavailable"] as const;
export type DayAvailabilityStatus = (typeof DAY_AVAILABILITY_STATUSES)[number];

export const DAY_AVAILABILITY_LABELS: Record<DayAvailabilityStatus, string> = {
  unset: "Sin indicar",
  available: "Todo el día",
  partial: "Franjas",
  unavailable: "No disponible",
};

export interface TimeSlot {
  start: ClockTime;
  end: ClockTime;
}

export interface DayAvailability {
  date: ISODate;
  status: DayAvailabilityStatus;
  slots: TimeSlot[];
}

/** availability/{employeeId}_{weekStart} — una semana (lunes a domingo) por empleado. */
export interface WeeklyAvailability {
  id: string;
  employeeId: EntityId;
  weekStart: ISODate; // lunes
  days: DayAvailability[]; // siempre 7
  note: string;
  updatedAt: Date | null;
  updatedBy: EntityId | null;
}
