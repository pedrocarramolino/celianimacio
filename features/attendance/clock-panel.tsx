"use client";
import { useEffect, useState } from "react";
import { Coffee, LogIn, LogOut, MapPin, Play, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingBlock, ErrorState } from "@/components/layout/states";
import { AttendanceStatusBadge } from "@/components/layout/status-badges";
import { SessionDetails } from "./session-details";
import { useAsync } from "@/hooks/use-async";
import { useGeolocation } from "@/hooks/use-geolocation";
import { attendanceService } from "@/services";
import { ACTION_LABELS, allowedActions, type AttendanceAction, type LocationEvaluation } from "@/services/domain/attendance-rules";
import { INCIDENT_LABELS, type Assignment, type CompanySettings } from "@/types";
import { formatDateTime, formatTime, minutesBetween } from "@/utils/dates";
import { formatMeters } from "@/utils/format";
import { errorMessage } from "@/utils/errors";

const ACTION_ICONS: Record<AttendanceAction, React.ComponentType<{ className?: string }>> = {
  check_in: LogIn,
  break_start: Coffee,
  break_end: Play,
  check_out: LogOut,
};

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function ClockPanel({ assignment, settings, onChanged }: { assignment: Assignment; settings: CompanySettings; onChanged: () => void }) {
  const ctx = useAsync(() => attendanceService.context(assignment, settings), [assignment.id, settings]);
  const { locate, locating } = useGeolocation();
  const now = useNow();
  const [pending, setPending] = useState<{ action: AttendanceAction; evaluation: LocationEvaluation } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (ctx.error) return <ErrorState message={ctx.error} onRetry={ctx.reload} />;
  if (!ctx.data) return <LoadingBlock rows={3} />;
  const c = ctx.data;
  const status = c.session?.status ?? null;
  const actions = allowedActions(status);
  const beforeWindow = !c.session && now < c.window.opensAt;
  const afterWindow = !c.session && now > c.window.closesAt;

  async function start(action: AttendanceAction) {
    setError(null);
    setDone(null);
    const geo = await locate();
    try {
      const evaluation = await attendanceService.evaluate(c, action, geo.reading, geo.error, settings);
      setPending({ action, evaluation });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await attendanceService.punch(c, pending.action, pending.evaluation);
      const message = `${ACTION_LABELS[pending.action]} registrada a las ${formatTime(new Date())}.`;
      await ctx.reload();
      setPending(null);
      setDone(message);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  const ev = pending?.evaluation;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{assignment.eventName}</CardTitle>
            <CardDescription>
              {assignment.shiftName} · {formatDateTime(c.shift.startAt)}–{formatTime(c.shift.endAt)}
            </CardDescription>
          </div>
          {status ? <AttendanceStatusBadge status={status} /> : <Badge variant="neutral">Sin fichar</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <MapPin className="size-4 text-primary" />
          <span>
            {c.target.name} · radio autorizado <strong>{c.target.radiusMeters} m</strong>
          </span>
        </div>

        <div className="text-center">
          <p className="text-4xl font-semibold tabular-nums tracking-tight">{formatTime(now)}</p>
          <p className="text-xs text-muted-foreground">Hora del dispositivo · se registrará la hora del servidor</p>
        </div>

        {status === "on_break" && c.openBreak && (
          <Alert variant="warning">
            En pausa desde las {formatTime(c.openBreak.start.serverAt ?? c.openBreak.start.clientAt)} ({minutesBetween(c.openBreak.start.serverAt ?? c.openBreak.start.clientAt, now)} min).
          </Alert>
        )}
        {beforeWindow && <Alert variant="info">El fichaje de entrada se abre a las {formatTime(c.window.opensAt)}.</Alert>}
        {afterWindow && <Alert variant="warning">El turno terminó sin fichaje de entrada. Contacta con administración.</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        {done && <Alert variant="success">{done}</Alert>}

        {status !== "closed" && !beforeWindow && !afterWindow && (
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((a) => {
              const Icon = ACTION_ICONS[a];
              return (
                <Button
                  key={a}
                  size="xl"
                  variant={a === "check_out" ? "outline" : a === "break_start" ? "secondary" : "default"}
                  className="w-full"
                  onClick={() => start(a)}
                  loading={locating}
                  disabled={saving}
                >
                  <Icon className="!size-6" /> {ACTION_LABELS[a]}
                </Button>
              );
            })}
          </div>
        )}
        {c.session && (
          <div className="rounded-lg border p-3">
            <SessionDetails session={c.session} />
          </div>
        )}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          Al fichar se solicita tu ubicación para comprobar que estás en el lugar del evento. La comprobación se hace en este dispositivo.
        </p>
      </CardContent>

      <Dialog open={pending != null} onOpenChange={(o) => !o && !saving && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar {pending ? ACTION_LABELS[pending.action].toLowerCase() : ""}</DialogTitle>
            <DialogDescription>Revisa el resultado de la ubicación antes de registrar.</DialogDescription>
          </DialogHeader>
          {ev && (
            <div className="space-y-3">
              {ev.withinRadius === true && (
                <Alert variant="success" title="Dentro del radio autorizado">
                  Estás a {formatMeters(ev.distanceMeters)} del punto del evento (precisión ±{ev.accuracyMeters} m).
                </Alert>
              )}
              {ev.withinRadius === false && (
                <Alert variant="error" title="Fuera del radio autorizado">
                  Estás a {formatMeters(ev.distanceMeters)} (radio {c.target.radiusMeters} m). Puedes registrar el fichaje, pero quedará como
                  incidencia y se avisará a administración.
                </Alert>
              )}
              {ev.withinRadius == null && (
                <Alert variant="warning" title="No se pudo validar la ubicación">
                  {ev.incidents[0]?.message} El fichaje se registrará como incidencia.
                </Alert>
              )}
              {ev.incidents.filter((i) => i.type === "low_accuracy").map((i, idx) => (
                <Alert key={idx} variant="warning">
                  {INCIDENT_LABELS[i.type]}: {i.message}
                </Alert>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={confirm} loading={saving}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
