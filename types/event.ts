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

export const EVENT_CATEGORIES = [
  "boda",
  "comunion",
  "bautizo",
  "cumpleanos",
  "fiesta_infantil",
  "papa_noel",
  "halloween",
  "fallas",
  "fiesta_espuma",
  "campus",
  "torneo",
  "empresa",
  "otro",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  boda: "Boda",
  comunion: "Comunión",
  bautizo: "Bautizo",
  cumpleanos: "Cumpleaños",
  fiesta_infantil: "Fiesta infantil",
  papa_noel: "Papá Noel / Navidad",
  halloween: "Halloween",
  fallas: "Fallas",
  fiesta_espuma: "Fiesta de la espuma",
  campus: "Campus / escuela de vacaciones",
  torneo: "Torneo / deportivo",
  empresa: "Evento de empresa",
  otro: "Otro",
};

export const EVENT_CATEGORY_EMOJI: Record<EventCategory, string> = {
  boda: "💍",
  comunion: "🕊️",
  bautizo: "👶",
  cumpleanos: "🎂",
  fiesta_infantil: "🎈",
  papa_noel: "🎅",
  halloween: "🎃",
  fallas: "🔥",
  fiesta_espuma: "🫧",
  campus: "🏕️",
  torneo: "⚽",
  empresa: "🏢",
  otro: "✨",
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
  /** Tipo de evento (eventos antiguos sin tipo se leen como "otro"). */
  category: EventCategory;
  /**
   * Empleados con asignación pendiente o confirmada en algún turno del evento.
   * Proyección mantenida por AssignmentService; se usa en las reglas para conceder lectura.
   */
  staffEmployeeIds: EntityId[];
  shiftCount: number;
}
