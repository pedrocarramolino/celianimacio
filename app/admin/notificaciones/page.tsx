"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationList } from "@/features/notifications/notification-list";
import { useAsync } from "@/hooks/use-async";
import { employeeService, eventService, notificationService } from "@/services";
import { notificationTemplates } from "@/services/notification.service";
import type { NotificationDraft } from "@/repositories/contracts";
import { formatISODate } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

export default function AdminNotificationsPage() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  return (
    <>
      <PageHeader
        title="Avisos"
        description="Incidencias de fichaje y avisos dirigidos a administración. Envía avisos internos al equipo."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Send /> Enviar aviso
          </Button>
        }
      />
      <Alert variant="info" className="mb-4">
        Los avisos son notificaciones internas: el trabajador las ve al entrar en la aplicación. El envío por correo electrónico o
        notificaciones push requiere un backend (no disponible en el plan gratuito sin Cloud Functions).
      </Alert>
      {sent != null && <Alert variant="success" className="mb-4">Aviso enviado a {sent} trabajador(es).</Alert>}
      <NotificationList />
      <SendDialog open={open} onOpenChange={setOpen} onSent={setSent} />
    </>
  );
}

function SendDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (o: boolean) => void; onSent: (n: number) => void }) {
  const data = useAsync(async () => {
    const [employees, events] = await Promise.all([employeeService.listActive(), eventService.upcoming(30)]);
    return { employees, events: events.filter((e) => e.status !== "cancelled") };
  }, [], open);
  const [kind, setKind] = useState<"general" | "reminder">("general");
  const [target, setTarget] = useState<string>("all");
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!data.data) return;
    setError(null);
    let drafts: NotificationDraft[] = [];
    if (kind === "reminder") {
      const ev = data.data.events.find((e) => e.id === eventId);
      if (!ev) return setError("Selecciona un evento.");
      if (ev.staffEmployeeIds.length === 0) return setError("El evento no tiene personal asignado.");
      drafts = ev.staffEmployeeIds.map((id) => notificationTemplates.eventReminder(id, ev.name, formatISODate(ev.date, { weekday: "long" })));
    } else {
      if (title.trim().length < 3) return setError("Escribe un título.");
      const ids = target === "all" ? data.data.employees.map((e) => e.id) : [target];
      drafts = ids.map((id) => ({ type: "general", title: title.trim(), body: body.trim(), link: null, recipientEmployeeId: id, recipientRole: null }));
    }
    setBusy(true);
    try {
      await notificationService.send(drafts);
      onSent(drafts.length);
      setTitle("");
      setBody("");
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar aviso interno</DialogTitle>
          <DialogDescription>Se crea una notificación en la aplicación para cada destinatario.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="n-kind">Tipo</Label>
            <Select id="n-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="general">Aviso general</option>
              <option value="reminder">Recordatorio de evento (al personal asignado)</option>
            </Select>
          </div>
          {kind === "reminder" ? (
            <div className="space-y-1.5">
              <Label htmlFor="n-event">Evento</Label>
              <Select id="n-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Selecciona…</option>
                {data.data?.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatISODate(e.date)} · {e.name} ({e.staffEmployeeIds.length})
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="n-target">Destinatarios</Label>
                <Select id="n-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="all">Todos los trabajadores activos ({data.data?.employees.length ?? 0})</option>
                  {data.data?.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-title">Título</Label>
                <Input id="n-title" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-body">Mensaje</Label>
                <Textarea id="n-body" rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={send} loading={busy} disabled={!data.data}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
