"use client";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/features/notifications/notification-list";

export default function WorkerNotificationsPage() {
  return (
    <>
      <PageHeader title="Avisos" description="Asignaciones, cambios de horario, cancelaciones y recordatorios." />
      <NotificationList />
    </>
  );
}
