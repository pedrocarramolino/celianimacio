import type { AuditFields, EntityId, ISODate } from "./common";
import type { LocationSnapshot } from "./location";

export const EVENT_STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  in_progress: "En curso",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

/** events/{eventId} */
export interface CompanyEvent extends AuditFields {
  id: EntityId;
  name: string;
  description: string;
  /** Fecha principal del evento (día de calendario en zona de la empresa). */
  date: ISODate;
  location: LocationSnapshot;
  instructions: string;
  status: EventStatus;
  /**
   * Empleados con asignación pendiente o confirmada en algún turno del evento.
   * Proyección mantenida por AssignmentService; se usa en las reglas para conceder lectura.
   */
  staffEmployeeIds: EntityId[];
  shiftCount: number;
}
