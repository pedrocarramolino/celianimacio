import type { NotificationDraft, NotificationRepository } from "@/repositories/contracts";
import type { AppNotification, NotificationChannelId } from "@/types";
import { requireActor, requireAdmin, requireEmployeeId, getCurrentSession } from "./session";

/**
 * Canal de entrega. En la v1 SOLO existe el canal interno (Firestore).
 * Correo y push (FCM) requieren un backend que envíe los mensajes (Cloud Functions/servidor):
 * cuando exista, se implementa esta interfaz y se registra en NotificationService.
 * No hay envíos automáticos por correo ni push en esta versión.
 */
export interface NotificationChannel {
  readonly id: NotificationChannelId;
  deliver(drafts: NotificationDraft[]): Promise<void>;
}

export class InAppNotificationChannel implements NotificationChannel {
  readonly id = "in_app" as const;
  constructor(private readonly repo: NotificationRepository) {}
  async deliver(drafts: NotificationDraft[]): Promise<void> {
    await this.repo.createMany(drafts, requireActor());
  }
}

export class NotificationService {
  private readonly channels: NotificationChannel[];

  constructor(
    private readonly repo: NotificationRepository,
    extraChannels: NotificationChannel[] = [],
  ) {
    this.channels = [new InAppNotificationChannel(repo), ...extraChannels];
  }

  availableChannels(): NotificationChannelId[] {
    return this.channels.map((c) => c.id);
  }

  /** Envío manual desde administración (p. ej. solicitud de disponibilidad o aviso general). */
  async send(drafts: NotificationDraft[]): Promise<void> {
    requireAdmin();
    for (const channel of this.channels) await channel.deliver(drafts);
  }

  async listMine(): Promise<AppNotification[]> {
    const session = getCurrentSession();
    if (session?.role === "admin") {
      const own = session.profile?.employeeId ? await this.repo.listForEmployee(session.profile.employeeId) : [];
      const admin = await this.repo.listForAdmins();
      return [...own, ...admin].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    }
    return this.repo.listForEmployee(requireEmployeeId());
  }

  async markRead(id: string): Promise<void> {
    requireActor();
    await this.repo.markRead(id);
  }

  async remove(id: string): Promise<void> {
    requireActor();
    await this.repo.remove(id);
  }
}

// ---- Plantillas de notificaciones --------------------------------------------
export const notificationTemplates = {
  assignmentNew: (employeeId: string, eventName: string, when: string, confirmed: boolean): NotificationDraft => ({
    type: "assignment_new",
    title: confirmed ? `Turno confirmado: ${eventName}` : `Nueva asignación: ${eventName}`,
    body: confirmed
      ? `Tu turno del ${when} está confirmado. Revisa la dirección y las instrucciones.`
      : `Te hemos preasignado a un turno el ${when}. Recibirás confirmación próximamente.`,
    link: "/trabajador/eventos/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  assignmentCancelled: (employeeId: string, eventName: string, when: string, reason: string): NotificationDraft => ({
    type: "assignment_cancelled",
    title: `Asignación cancelada: ${eventName}`,
    body: `Se ha cancelado tu turno del ${when}.${reason ? ` Motivo: ${reason}` : ""}`,
    link: "/trabajador/eventos/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  scheduleChanged: (employeeId: string, eventName: string, when: string): NotificationDraft => ({
    type: "schedule_changed",
    title: `Cambio de horario: ${eventName}`,
    body: `El turno ha cambiado. Nuevo horario: ${when}.`,
    link: "/trabajador/eventos/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  eventCancelled: (employeeId: string, eventName: string, reason: string): NotificationDraft => ({
    type: "event_cancelled",
    title: `Evento cancelado: ${eventName}`,
    body: `El evento ha sido cancelado.${reason ? ` Motivo: ${reason}` : ""}`,
    link: "/trabajador/eventos/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  eventReminder: (employeeId: string, eventName: string, when: string): NotificationDraft => ({
    type: "event_reminder",
    title: `Recordatorio: ${eventName}`,
    body: `Recuerda tu turno del ${when}.`,
    link: "/trabajador/eventos/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  availabilityRequest: (employeeId: string, weekLabel: string): NotificationDraft => ({
    type: "availability_request",
    title: "Indica tu disponibilidad",
    body: `Por favor, actualiza tu disponibilidad para la semana del ${weekLabel}.`,
    link: "/trabajador/disponibilidad/",
    recipientEmployeeId: employeeId,
    recipientRole: null,
  }),
  assignmentResponse: (employeeName: string, eventName: string, when: string, accepted: boolean): NotificationDraft => ({
    type: "assignment_response",
    title: accepted ? `✅ ${employeeName} va a ${eventName}` : `❌ ${employeeName} no puede ir a ${eventName}`,
    body: `Turno del ${when}.${accepted ? "" : " Busca a otra persona en Asignaciones."}`,
    link: "/admin/asignaciones/",
    recipientEmployeeId: null,
    recipientRole: "admin",
  }),
  attendanceIncident: (employeeName: string, eventName: string, detail: string): NotificationDraft => ({
    type: "attendance_incident",
    title: `Incidencia de fichaje: ${employeeName}`,
    body: `${eventName}: ${detail}`,
    link: "/admin/fichajes/",
    recipientEmployeeId: null,
    recipientRole: "admin",
  }),
};
