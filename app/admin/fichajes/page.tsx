"use client";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, MapPinCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { AttendanceStatusBadge } from "@/components/layout/status-badges";
import { SessionDetails } from "@/features/attendance/session-details";
import { useAsync } from "@/hooks/use-async";
import { attendanceService } from "@/services";
import type { AttendanceSession } from "@/types";
import { addDaysISO, dayRange, formatISODate, formatTime, toClockTime, toISODate, todayISO, zonedDateTimeToDate } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

export default function AttendanceAdminPage() {
  const [mode, setMode] = useState<"day" | "open" | "incidents">("day");
  const [day, setDay] = useState(todayISO());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [closing, setClosing] = useState<AttendanceSession | null>(null);

  const data = useAsync(async () => {
    if (mode === "open") return attendanceService.listOpen();
    if (mode === "incidents") {
      const from = dayRange(addDaysISO(todayISO(), -30)).start;
      const to = dayRange(todayISO()).end;
      return (await attendanceService.listRange(from, to)).filter((s) => s.hasIncident).reverse();
    }
    const { start, end } = dayRange(day);
    return attendanceService.listRange(start, end);
  }, [mode, day]);

  return (
    <>
      <PageHeader title="Fichajes" description="Entradas, pausas y salidas registradas con ubicación del dispositivo." />
      <Alert variant="warning" className="mb-4" title="Validación de ubicación en el dispositivo">
        En esta versión la posición y la distancia las calcula el móvil del trabajador. La hora registrada es la del servidor de
        Firebase, pero la ubicación puede falsearse: úsala como indicio, no como prueba.
      </Alert>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          label="Vista"
          value={mode}
          onChange={setMode}
          options={[
            { value: "day", label: "Por día" },
            { value: "open", label: "Jornadas abiertas" },
            { value: "incidents", label: "Incidencias (30 días)" },
          ]}
        />
        {mode === "day" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => setDay(addDaysISO(day, -1))}>
              <ChevronLeft />
            </Button>
            <Input type="date" aria-label="Día" className="w-40" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
            <Button variant="outline" size="icon" aria-label="Día siguiente" onClick={() => setDay(addDaysISO(day, 1))}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.loading && !data.data && <LoadingBlock />}
      {data.data && data.data.length === 0 && <EmptyState icon={MapPinCheck} title="No hay fichajes" />}
      <div className="space-y-2">
        {data.data?.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
                aria-expanded={expanded === s.id}
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="min-w-0">
                  <p className="font-medium">{s.employeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.eventName} · {s.shiftName} · {formatISODate(toISODate(s.shiftStartAt), { year: undefined })} {formatTime(s.shiftStartAt)}–{formatTime(s.shiftEndAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.hasIncident && <span className="size-2 rounded-full bg-warning" aria-label="Con incidencias" />}
                  <AttendanceStatusBadge status={s.status} />
                  <ChevronDown className={`size-4 transition-transform ${expanded === s.id ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expanded === s.id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <SessionDetails session={s} />
                  {s.status !== "closed" && (
                    <Button size="sm" variant="outline" onClick={() => setClosing(s)}>
                      Cerrar jornada manualmente
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <CloseDialog session={closing} onClose={() => setClosing(null)} onDone={data.reload} />
    </>
  );
}

function CloseDialog({ session, onClose, onDone }: { session: AttendanceSession | null; onClose: () => void; onDone: () => Promise<void> }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = session != null;
  const defaultEnd = session ? session.shiftEndAt : new Date();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
        else if (session) {
          setDate(toISODate(defaultEnd));
          setTime(toClockTime(defaultEnd));
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar jornada</DialogTitle>
          <DialogDescription>
            Registra la hora de salida comunicada. Quedará marcada como incidencia “Salida no registrada” y con tu nota.
          </DialogDescription>
        </DialogHeader>
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="close-date">Fecha de salida</Label>
            <Input id="close-date" type="date" value={date || (session ? toISODate(defaultEnd) : "")} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-time">Hora de salida</Label>
            <Input id="close-time" type="time" value={time || (session ? toClockTime(defaultEnd) : "")} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="close-note">Motivo</Label>
          <Textarea id="close-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              if (!session) return;
              setBusy(true);
              setError(null);
              try {
                const d = date || toISODate(defaultEnd);
                const t = time || toClockTime(defaultEnd);
                await attendanceService.adminClose(session, zonedDateTimeToDate(d, t), note);
                setNote("");
                onClose();
                await onDone();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Cerrar jornada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
