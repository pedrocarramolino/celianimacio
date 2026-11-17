"use client";
import { Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { useAsync } from "@/hooks/use-async";
import { eventService, shiftService } from "@/services";
import type { Assignment } from "@/types";
import { formatDateLong, formatTime } from "@/utils/dates";
import { mapsUrl } from "@/utils/geo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/layout/states";
import { EventSheetView } from "@/features/events/event-sheet-view";

/**
 * Detalle de un turno para el trabajador asignado: horario, dirección, instrucciones y
 * compañeros confirmados (solo nombres, vía shiftTeams).
 */
export function WorkerShiftDetails({ assignment }: { assignment: Assignment }) {
  const data = useAsync(async () => {
    const shift = await shiftService.get(assignment.shiftId);
    const event = await eventService.get(shift.eventId);
    const team = assignment.status === "confirmed" ? await shiftService.team(shift.id).catch(() => null) : null;
    return { shift, event, team };
  }, [assignment.id, assignment.updatedAt?.getTime()]);

  if (assignment.status === "cancelled") {
    return <Alert variant="warning">Asignación cancelada{assignment.cancelledReason ? `: ${assignment.cancelledReason}` : "."}</Alert>;
  }
  if (data.error) return <Alert variant="error">{data.error}</Alert>;
  if (!data.data) return <LoadingBlock rows={2} />;
  const { shift, event, team } = data.data;
  const loc = shift.location ?? event.location;
  const mates = team?.members.filter((m) => m.employeeId !== assignment.employeeId) ?? [];

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 text-primary" />
          <div>
            <p className="font-medium">{formatDateLong(shift.startAt)}</p>
            <p className="text-muted-foreground">
              {formatTime(shift.startAt)} – {formatTime(shift.endAt)}
              {shift.position && ` · ${shift.position}`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-primary" />
          <div>
            <p className="font-medium">{loc.name}</p>
            <p className="text-muted-foreground">{loc.address || "Dirección no indicada"}</p>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <a href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Cómo llegar
              </a>
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-3">
        <EventSheetView event={event} />
      </div>
      {(event.instructions || shift.instructions) && (
        <div className="space-y-2 rounded-lg bg-muted/60 p-3">
          <p className="font-medium">Instrucciones</p>
          {event.instructions && <p className="whitespace-pre-line text-muted-foreground">{event.instructions}</p>}
          {shift.instructions && <p className="whitespace-pre-line text-muted-foreground">{shift.instructions}</p>}
        </div>
      )}
      {assignment.status === "confirmed" ? (
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 text-primary" />
          <div>
            <p className="font-medium">Compañeros del turno</p>
            <p className="text-muted-foreground">{mates.length ? mates.map((m) => m.displayName).join(", ") : "Aún no hay más compañeros confirmados."}</p>
          </div>
        </div>
      ) : (
        <Alert variant="info">Turno pendiente de confirmación. Verás a tus compañeros cuando se confirme.</Alert>
      )}
    </div>
  );
}
