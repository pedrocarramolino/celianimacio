import type { AuditFields, EntityId, ISODate } from "./common";
import type { LocationSnapshot } from "./location";

export const SHIFT_STATUSES = ["open", "partially_filled", "filled", "cancelled"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  open: "Sin cubrir",
  partially_filled: "Parcial",
  filled: "Completo",
  cancelled: "Cancelado",
};

/** shifts/{shiftId} */
export interface Shift extends AuditFields {
  id: EntityId;
  eventId: EntityId;
  eventName: string;
  name: string;
  /** Día del inicio del turno (zona empresa), para filtros por semana/día. */
  date: ISODate;
  startAt: Date;
  endAt: Date;
  requiredWorkers: number;
  position: string;
  /** Ubicación específica del turno; si es null se usa la del evento. */
  location: LocationSnapshot | null;
  instructions: string;
  status: ShiftStatus;
  /** Empleados con asignación pendiente o confirmada (proyección para reglas). */
  staffEmployeeIds: EntityId[];
  /** Empleados con asignación confirmada. */
  confirmedEmployeeIds: EntityId[];
}

/**
 * shiftTeams/{shiftId} — nombres visibles de los compañeros CONFIRMADOS de un turno.
 * Existe para que un trabajador vea solo el nombre de sus compañeros, nunca su ficha privada.
 */
export interface ShiftTeam {
  id: EntityId; // = shiftId
  shiftId: EntityId;
  eventId: EntityId;
  memberEmployeeIds: EntityId[];
  members: { employeeId: EntityId; displayName: string; position: string }[];
  updatedAt: Date | null;
}
