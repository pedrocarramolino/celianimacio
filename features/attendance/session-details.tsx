"use client";
import { ExternalLink } from "lucide-react";
import { useAsync } from "@/hooks/use-async";
import { attendanceService } from "@/services";
import { INCIDENT_LABELS, type AttendancePunch, type AttendanceSession } from "@/types";
import { formatDateTime, formatMinutes } from "@/utils/dates";
import { formatMeters } from "@/utils/format";
import { mapsUrl } from "@/utils/geo";
import { Badge } from "@/components/ui/badge";

export function PunchLine({ label, punch }: { label: string; punch: AttendancePunch | null }) {
  if (!punch) return null;
  const drift = punch.serverAt ? Math.round(Math.abs(punch.serverAt.getTime() - punch.clientAt.getTime()) / 60000) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="w-28 font-medium">{label}</span>
      <span>{formatDateTime(punch.serverAt ?? punch.clientAt)}</span>
      {drift != null && drift >= 2 && <Badge variant="warning">Reloj del móvil desfasado {drift} min</Badge>}
      {punch.withinRadius === true && <Badge variant="success">Dentro · {formatMeters(punch.distanceMeters)}</Badge>}
      {punch.withinRadius === false && <Badge variant="danger">Fuera · {formatMeters(punch.distanceMeters)}</Badge>}
      {punch.withinRadius == null && <Badge variant="neutral">Sin ubicación</Badge>}
      {punch.accuracyMeters != null && <span className="text-xs text-muted-foreground">±{Math.round(punch.accuracyMeters)} m</span>}
      {punch.coords && (
        <a href={mapsUrl(punch.coords)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="size-3" /> Mapa
        </a>
      )}
    </div>
  );
}

export function SessionDetails({ session }: { session: AttendanceSession }) {
  const breaks = useAsync(() => attendanceService.breaksOf(session), [session.id, session.updatedAt?.getTime()]);
  return (
    <div className="space-y-2">
      <PunchLine label="Entrada" punch={session.checkIn} />
      {breaks.data?.map((b) => (
        <div key={b.id} className="space-y-1 border-l-2 border-warning/40 pl-3">
          <PunchLine label={`Pausa ${b.index}`} punch={b.start} />
          <PunchLine label="Fin de pausa" punch={b.end} />
          {b.durationMinutes != null && <p className="text-xs text-muted-foreground">Duración: {b.durationMinutes} min</p>}
        </div>
      ))}
      <PunchLine label="Salida" punch={session.checkOut} />
      <p className="text-sm">
        <span className="font-medium">Tiempo neto:</span> {formatMinutes(session.workedMinutes)} · pausas {session.totalBreakMinutes} min
      </p>
      {session.incidents.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-warning-soft p-3 text-xs text-warning">
          {session.incidents.map((i, idx) => (
            <li key={idx}>
              <strong>{INCIDENT_LABELS[i.type]}</strong>: {i.message}
            </li>
          ))}
        </ul>
      )}
      {session.adminNote && <p className="text-xs text-muted-foreground">Nota de administración: {session.adminNote}</p>}
    </div>
  );
}
