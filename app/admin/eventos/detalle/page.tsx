"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Ban, CalendarPlus, ClipboardCheck, MapPin, Pencil, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SegmentedTabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, FullScreenLoader, LoadingBlock } from "@/components/layout/states";
import { EventStatusBadge, ShiftStatusBadge } from "@/components/layout/status-badges";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EventForm } from "@/features/events/event-form";
import { ShiftFormDialog, emptyShift } from "@/features/events/shift-form-dialog";
import { useAsync } from "@/hooks/use-async";
import { eventService, shiftService } from "@/services";
import { eventToForm } from "@/services/event.service";
import { shiftToForm } from "@/services/shift.service";
import type { CompanyEvent, Shift } from "@/types";
import { formatISODate, formatTime } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";
import { mapsUrl } from "@/utils/geo";

export default function EventDetailPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <EventDetail />
    </Suspense>
  );
}

function EventDetail() {
  const id = useSearchParams().get("id") ?? "";
  const data = useAsync(
    async () => {
      const [event, shifts, locations] = await Promise.all([
        eventService.get(id),
        shiftService.listByEvent(id),
        eventService.listLocations(),
      ]);
      return { event, shifts, locations };
    },
    [id],
    Boolean(id),
  );
  const [tab, setTab] = useState<"turnos" | "datos">("turnos");
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!id) return <ErrorState message="Falta el identificador del evento." />;
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;
  if (!data.data) return <LoadingBlock rows={5} />;
  const { event, shifts, locations } = data.data;
  const cancelled = event.status === "cancelled";

  return (
    <>
      <Link href="/admin/eventos/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Eventos
      </Link>
      <PageHeader
        title={event.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {formatISODate(event.date, { weekday: "long" })} · <EventStatusBadge status={event.status} />
          </span>
        }
        actions={
          !cancelled && (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <Ban /> Cancelar evento
            </Button>
          )
        }
      />
      {cancelled && (
        <Alert variant="warning" className="mb-4" title="Evento cancelado">
          Los turnos y asignaciones se cancelaron y el personal fue notificado en la aplicación.
        </Alert>
      )}
      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="font-medium">{event.location.name}</p>
              <p className="text-muted-foreground">
                {event.location.address || "Sin dirección"} · radio {event.location.radiusMeters} m
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer">
              Abrir mapa
            </a>
          </Button>
        </CardContent>
      </Card>
      <SegmentedTabs
        label="Secciones del evento"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "turnos", label: `Turnos (${shifts.length})` },
          { value: "datos", label: "Datos del evento" },
        ]}
      />
      {tab === "turnos" && <ShiftsSection event={event} shifts={shifts} onChanged={data.reload} />}
      {tab === "datos" &&
        (cancelled ? (
          <Alert variant="info">Un evento cancelado no se puede editar.</Alert>
        ) : (
          <EditEvent event={event} locations={locations} onSaved={data.reload} />
        ))}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar evento"
        description="Se cancelarán todos sus turnos y asignaciones y se avisará a las personas asignadas mediante notificación interna. Esta acción no se puede deshacer."
        confirmLabel="Cancelar evento"
        destructive
        reason="optional"
        onConfirm={async (reason) => {
          await eventService.cancel(event.id, reason);
          await data.reload();
        }}
      />
    </>
  );
}

function EditEvent({ event, locations, onSaved }: { event: CompanyEvent; locations: Parameters<typeof EventForm>[0]["locations"]; onSaved: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <>
      {saved && <Alert variant="success" className="mb-3">Evento actualizado.</Alert>}
      <Alert variant="info" className="mb-3">
        Los cambios de ubicación se aplican a los turnos que usan la ubicación del evento y a los fichajes futuros.
      </Alert>
      <EventForm
        key={event.updatedAt?.getTime() ?? 0}
        defaultValues={eventToForm(event)}
        locations={locations}
        submitLabel="Guardar cambios"
        error={error}
        onSubmit={async (v) => {
          setError(null);
          setSaved(false);
          try {
            await eventService.update(event.id, v);
            setSaved(true);
            await onSaved();
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      />
    </>
  );
}

function ShiftsSection({ event, shifts, onChanged }: { event: CompanyEvent; shifts: Shift[]; onChanged: () => Promise<void> }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [cancelling, setCancelling] = useState<Shift | null>(null);
  const cancelled = event.status === "cancelled";

  return (
    <>
      <div className="mb-3 flex justify-end">
        {!cancelled && (
          <Button onClick={() => setCreating(true)}>
            <CalendarPlus /> Añadir turno
          </Button>
        )}
      </div>
      {shifts.length === 0 ? (
        <EmptyState title="Este evento no tiene turnos" description="Añade al menos un turno para poder asignar personal." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shifts.map((s) => (
            <Card key={s.id} className={s.status === "cancelled" ? "opacity-70" : undefined}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>
                    {formatISODate(s.date, { weekday: "short" })} · {formatTime(s.startAt)}–{formatTime(s.endAt)}
                    {s.position && ` · ${s.position}`}
                  </CardDescription>
                </div>
                <ShiftStatusBadge status={s.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-primary" /> {s.confirmedEmployeeIds.length} confirmados de {s.requiredWorkers} ·{" "}
                  {s.staffEmployeeIds.length - s.confirmedEmployeeIds.length} pendientes
                </p>
                {s.location && <p className="text-xs text-muted-foreground">Ubicación propia: {s.location.name}</p>}
                {s.status !== "cancelled" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/admin/asignaciones/?turno=${s.id}`}>
                        <ClipboardCheck /> Asignar
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(s)}>
                      Cancelar turno
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ShiftFormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo turno"
        defaultValues={emptyShift(event)}
        onSubmit={async (v) => {
          await shiftService.create(event, v);
          await onChanged();
        }}
      />
      <ShiftFormDialog
        open={editing != null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar turno"
        warning={editing && editing.staffEmployeeIds.length > 0 ? "Si cambias el horario, se avisará a las personas asignadas." : undefined}
        defaultValues={editing ? shiftToForm(editing) : emptyShift(event)}
        onSubmit={async (v) => {
          if (editing) await shiftService.update(editing, v);
          await onChanged();
        }}
      />
      <ConfirmDialog
        open={cancelling != null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancelar turno"
        description="Se cancelarán sus asignaciones y se avisará al personal asignado."
        confirmLabel="Cancelar turno"
        destructive
        reason="optional"
        onConfirm={async (reason) => {
          if (cancelling) await shiftService.cancel(cancelling, reason);
          await onChanged();
        }}
      />
    </>
  );
}
