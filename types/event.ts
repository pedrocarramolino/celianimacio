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

/**
 * Ficha operativa del evento (visible para el personal asignado).
 * Refleja la ficha que usa la empresa: hora de nave, horario, estancia, niños, edades,
 * vestimenta, material/observaciones y teléfono de contacto.
 */
export interface EventSheet {
  /** Hora de quedada en la nave/almacén (HH:mm) o "". */
  meetingTime: string;
  meetingPlace: string;
  /** Horario del evento (HH:mm) o "". */
  startTime: string;
  endTime: string;
  /** Estancia / sala dentro del lugar. */
  room: string;
  kids: number | null;
  ages: string;
  dressCode: string;
  /** Material y actividades (observaciones). */
  material: string;
  contactPhone: string;
  /** Precio total acordado con el cliente (€). Visible para el equipo. */
  totalPrice: number | null;
  /** Cantidad ya pagada / señal (€). */
  paidAmount: number | null;
  /** Precio de la hora extra (texto libre, p. ej. "50 €/h"). */
  extraHour: string;
}

/** Importe pendiente de cobro, o null si no hay precio. */
export function pendingAmount(s: Pick<EventSheet, "totalPrice" | "paidAmount">): number | null {
  if (s.totalPrice == null) return null;
  return Math.max(0, Math.round((s.totalPrice - (s.paidAmount ?? 0)) * 100) / 100);
}

export const EMPTY_SHEET: EventSheet = {
  meetingTime: "",
  meetingPlace: "",
  startTime: "",
  endTime: "",
  room: "",
  kids: null,
  ages: "",
  dressCode: "",
  material: "",
  contactPhone: "",
  totalPrice: null,
  paidAmount: null,
  extraHour: "",
};

/** eventPrivate/{eventId} — notas internas, solo administración. */
export interface EventPrivate {
  adminNotes: string;
}

export const EMPTY_PRIVATE: EventPrivate = { adminNotes: "" };

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
  sheet: EventSheet;
  /**
   * Empleados con asignación pendiente o confirmada en algún turno del evento.
   * Proyección mantenida por AssignmentService; se usa en las reglas para conceder lectura.
   */
  staffEmployeeIds: EntityId[];
  shiftCount: number;
}
