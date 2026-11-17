import type { EntityId } from "./common";

export const NOTIFICATION_TYPES = [
  "assignment_new",
  "assignment_cancelled",
  "schedule_changed",
  "event_cancelled",
  "event_reminder",
  "availability_request",
  "attendance_incident",
  "general",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  assignment_new: "Nueva asignación",
  assignment_cancelled: "Asignación cancelada",
  schedule_changed: "Cambio de horario",
  event_cancelled: "Evento cancelado",
  event_reminder: "Recordatorio de evento",
  availability_request: "Solicitud de disponibilidad",
  attendance_incident: "Incidencia de fichaje",
  general: "Aviso",
};

/** Canales: en la v1 solo existe "in_app" (Firestore). */
export type NotificationChannelId = "in_app" | "email" | "push";

/**
 * notifications/{id}. El destinatario es un empleado concreto (recipientEmployeeId)
 * o el conjunto de administradores (recipientRole = "admin").
 */
export interface AppNotification {
  id: EntityId;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  recipientEmployeeId: EntityId | null;
  recipientRole: "admin" | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date | null;
  createdBy: EntityId | null;
}
