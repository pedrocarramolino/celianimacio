"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DAY_AVAILABILITY_LABELS, DAY_AVAILABILITY_STATUSES, type DayAvailability, type DayAvailabilityStatus, type WeeklyAvailability } from "@/types";
import { emptyWeek, validateSlots } from "@/services/domain/availability-rules";
import { formatDateTime, formatISODate, todayISO } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";

const tone: Record<DayAvailabilityStatus, string> = {
  unset: "data-[on=true]:bg-card data-[on=true]:text-foreground",
  available: "data-[on=true]:bg-success data-[on=true]:text-white",
  partial: "data-[on=true]:bg-primary data-[on=true]:text-white",
  unavailable: "data-[on=true]:bg-destructive data-[on=true]:text-white",
};

/** Editor semanal de disponibilidad (portal del trabajador y administración). */
export function WeekEditor({
  weekStart,
  initial,
  onSave,
  readOnlyPast = true,
  loading = false,
}: {
  weekStart: string;
  initial: WeeklyAvailability | null;
  onSave: (days: DayAvailability[], note: string) => Promise<void>;
  readOnlyPast?: boolean;
  loading?: boolean;
}) {
  const [days, setDays] = useState<DayAvailability[]>(() => initial?.days ?? emptyWeek(weekStart));
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const today = todayISO();

  useEffect(() => {
    setDays(initial?.days?.length === 7 ? initial.days : emptyWeek(weekStart));
    setNote(initial?.note ?? "");
  }, [initial, weekStart]);

  useEffect(() => setMessage(null), [weekStart]);

  const update = (i: number, patch: Partial<DayAvailability>) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const setStatus = (i: number, status: DayAvailabilityStatus) =>
    update(i, { status, slots: status === "partial" ? (days[i]?.slots.length ? days[i]!.slots : [{ start: "09:00", end: "14:00" }]) : [] });

  async function save() {
    setMessage(null);
    for (const d of days) {
      const err = validateSlots(d);
      if (err) {
        setMessage({ kind: "error", text: `${formatISODate(d.date, { weekday: "long" })}: ${err}` });
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(days, note);
      setMessage({ kind: "success", text: "Disponibilidad guardada." });
    } catch (e) {
      setMessage({ kind: "error", text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setDays((p) => p.map((d) => (readOnlyPast && d.date < today ? d : { ...d, status: "available", slots: [] })))}>
          Marcar toda la semana disponible
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setDays((p) => p.map((d) => (readOnlyPast && d.date < today ? d : { ...d, status: "unset", slots: [] })))}>
          Limpiar
        </Button>
      </div>
      <div className="space-y-2">
        {days.map((d, i) => {
          const past = readOnlyPast && d.date < today;
          return (
            <Card key={d.date} className={cn(past && "opacity-60")}>
              <CardContent className="flex flex-col gap-3 py-3 pt-3 md:flex-row md:items-start">
                <div className="w-40 shrink-0">
                  <p className="font-medium capitalize">{formatISODate(d.date, { weekday: "long", year: undefined, month: undefined })}</p>
                  <p className="text-xs text-muted-foreground">{formatISODate(d.date)}</p>
                </div>
                <div className="flex-1 space-y-3">
                  <div role="radiogroup" aria-label={`Disponibilidad ${d.date}`} className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                    {DAY_AVAILABILITY_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={d.status === s}
                        data-on={d.status === s}
                        disabled={past}
                        onClick={() => setStatus(i, s)}
                        className={cn("flex-1 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed data-[on=true]:shadow-sm", tone[s])}
                      >
                        {DAY_AVAILABILITY_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {d.status === "partial" && (
                    <div className="space-y-2">
                      {d.slots.map((slot, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <Input
                            type="time"
                            aria-label="Desde"
                            className="w-32"
                            value={slot.start}
                            disabled={past}
                            onChange={(e) => update(i, { slots: d.slots.map((x, xi) => (xi === si ? { ...x, start: e.target.value } : x)) })}
                          />
                          <span className="text-sm text-muted-foreground">a</span>
                          <Input
                            type="time"
                            aria-label="Hasta"
                            className="w-32"
                            value={slot.end}
                            disabled={past}
                            onChange={(e) => update(i, { slots: d.slots.map((x, xi) => (xi === si ? { ...x, end: e.target.value } : x)) })}
                          />
                          <Button type="button" variant="ghost" size="icon" aria-label="Eliminar franja" disabled={past} onClick={() => update(i, { slots: d.slots.filter((_, xi) => xi !== si) })}>
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      {d.slots.length < 6 && !past && (
                        <Button type="button" variant="link" size="sm" onClick={() => update(i, { slots: [...d.slots, { start: "16:00", end: "20:00" }] })}>
                          <Plus /> Añadir franja
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="availability-note">Comentario (opcional)</Label>
        <Textarea id="availability-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {message && <Alert variant={message.kind}>{message.text}</Alert>}
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{initial?.updatedAt ? `Última actualización: ${formatDateTime(initial.updatedAt)}` : "Aún no guardada"}</p>
        <Button onClick={save} loading={saving} disabled={loading}>
          Guardar disponibilidad
        </Button>
      </div>
    </div>
  );
}
