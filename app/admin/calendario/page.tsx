"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { ShiftStatusBadge } from "@/components/layout/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/use-async";
import { eventService, shiftService } from "@/services";
import { CategoryBadge } from "@/components/layout/category-badge";
import { EVENT_CATEGORY_EMOJI, type CompanyEvent, type Shift } from "@/types";
import {
  addMonthsISO,
  formatISODate,
  formatMonth,
  formatTime,
  monthGridISO,
  monthStartISO,
  todayISO,
  weekDaysISO,
  weekStartISO,
} from "@/utils/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dotTone: Record<Shift["status"], string> = {
  open: "bg-destructive",
  partially_filled: "bg-warning",
  filled: "bg-success",
  cancelled: "bg-muted-foreground/40",
};

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  return (
    <>
      <PageHeader
        title="Calendario"
        description="Eventos, turnos y su cobertura."
        actions={
          <SegmentedTabs
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: "month", label: "Mes" },
              { value: "week", label: "Semana" },
            ]}
          />
        }
      />
      {view === "month" ? <MonthView /> : <WeekView />}
    </>
  );
}

function ShiftChip({ s, compact }: { s: Shift; compact?: boolean }) {
  return (
    <Link
      href={`/admin/asignaciones/?turno=${s.id}`}
      title={`${s.eventName} · ${s.name} · ${s.confirmedEmployeeIds.length}/${s.requiredWorkers}`}
      className={cn(
        "flex items-center gap-1.5 truncate rounded-md border bg-background px-1.5 py-0.5 text-[11px] leading-tight hover:border-primary",
        s.status === "cancelled" && "line-through opacity-60",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotTone[s.status])} aria-hidden />
      <span className="font-semibold">{formatTime(s.startAt)}</span>
      {!compact && <span className="truncate">{s.eventName}</span>}
    </Link>
  );
}

function EventChip({ e }: { e: CompanyEvent }) {
  return (
    <Link
      href={`/admin/eventos/detalle/?id=${e.id}`}
      title={`${e.name}${e.shiftCount === 0 ? " · sin turnos" : ""}`}
      className={cn(
        "flex items-center gap-1 truncate rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-tight text-primary-foreground hover:bg-primary-hover",
        e.status === "cancelled" && "line-through opacity-60",
      )}
    >
      <span aria-hidden>{EVENT_CATEGORY_EMOJI[e.category]}</span>
      <span className="truncate">{e.name}</span>
    </Link>
  );
}

/** Carga eventos y turnos de un rango de fechas. */
async function loadRange(from: string, to: string) {
  const [shifts, events] = await Promise.all([shiftService.listRange(from, to), eventService.listRange(from, to)]);
  return { shifts, events };
}

function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
  return map;
}

function MonthView() {
  const today = todayISO();
  const [month, setMonth] = useState(() => monthStartISO(today));
  const [selected, setSelected] = useState<string>(today);
  const grid = useMemo(() => monthGridISO(month), [month]);
  const { data, error, loading, reload } = useAsync(() => loadRange(grid[0]!, grid.at(-1)!), [month]);

  const byDay = useMemo(() => groupByDate(data?.shifts ?? []), [data]);
  const eventsByDay = useMemo(() => groupByDate(data?.events ?? []), [data]);
  const dayShifts = byDay.get(selected) ?? [];
  const dayEvents = eventsByDay.get(selected) ?? [];
  const monthKey = month.slice(0, 7);

  const go = (delta: number) => {
    const next = addMonthsISO(month, delta);
    setMonth(next);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => go(-1)}>
            <ChevronLeft />
          </Button>
          <h2 className="min-w-44 px-2 text-center text-lg font-semibold" aria-live="polite">
            {formatMonth(month)}
          </h2>
          <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => go(1)}>
            <ChevronRight />
          </Button>
          {monthKey !== today.slice(0, 7) && (
            <Button variant="ghost" size="sm" onClick={() => { setMonth(monthStartISO(today)); setSelected(today); }}>
              Hoy
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive" /> Sin cubrir</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> Parcial</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> Completo</span>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock rows={5} />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((d) => {
                const items = byDay.get(d) ?? [];
                const evs = eventsByDay.get(d) ?? [];
                const inMonth = d.startsWith(monthKey);
                const isToday = d === today;
                const isSel = d === selected;
                return (
                  <div
                    key={d}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    aria-label={`${formatISODate(d, { weekday: "long" })}: ${evs.length} evento(s), ${items.length} turno(s)`}
                    onClick={() => setSelected(d)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(d)}
                    className={cn(
                      "min-h-16 cursor-pointer border-b border-r p-1 text-left transition-colors sm:min-h-28 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-muted/30 text-muted-foreground",
                      isSel && "bg-primary-soft/60",
                      "hover:bg-primary-soft/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {/* Móvil: puntos */}
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className="text-[10px] leading-none" aria-hidden>
                          {EVENT_CATEGORY_EMOJI[e.category]}
                        </span>
                      ))}
                      {items.slice(0, 6).map((s) => (
                        <span key={s.id} className={cn("size-1.5 rounded-full", dotTone[s.status])} />
                      ))}
                    </div>
                    {/* Escritorio: turnos */}
                    <div className="hidden space-y-0.5 sm:block">
                      {evs.slice(0, 2).map((e) => (
                        <EventChip key={e.id} e={e} />
                      ))}
                      {items.slice(0, Math.max(0, 3 - Math.min(evs.length, 2))).map((s) => (
                        <ShiftChip key={s.id} s={s} compact={evs.length > 0} />
                      ))}
                      {evs.length + items.length > 3 && (
                        <p className="px-1 text-[11px] text-muted-foreground">+{evs.length + items.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="capitalize">{formatISODate(selected, { weekday: "long", year: undefined })}</CardTitle>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/admin/eventos/nuevo/">
                  <Plus /> Evento
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dayEvents.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {dayEvents.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/admin/eventos/detalle/?id=${e.id}`}
                        className={cn("block rounded-lg border border-primary/30 bg-primary-soft/40 p-3 text-sm hover:border-primary", e.status === "cancelled" && "opacity-60")}
                      >
                        <p className="font-semibold">{e.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <CategoryBadge category={e.category} />
                          <span className="text-xs text-muted-foreground">{e.location.name}</span>
                        </div>
                        {e.shiftCount === 0 && <p className="mt-1 text-xs font-medium text-warning">Sin turnos: pulsa para añadirlos</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {dayShifts.length === 0 ? (
                dayEvents.length === 0 && <EmptyState title="Nada programado este día" />
              ) : (
                <ul className="space-y-2">
                  {dayShifts.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/admin/asignaciones/?turno=${s.id}`}
                        className={cn("block rounded-lg border p-3 text-sm hover:border-primary", s.status === "cancelled" && "opacity-60")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">
                            {formatTime(s.startAt)}–{formatTime(s.endAt)}
                          </p>
                          <ShiftStatusBadge status={s.status} />
                        </div>
                        <p className="truncate">{s.eventName}</p>
                        <p className="truncate text-muted-foreground">
                          {s.name} · {s.confirmedEmployeeIds.length}/{s.requiredWorkers} confirmados
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function WeekView() {
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const days = weekDaysISO(weekStart);
  const { data, error, loading, reload } = useAsync(() => loadRange(days[0]!, days[6]!), [weekStart]);
  const today = todayISO();

  return (
    <div className="space-y-4">
      <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock rows={4} />}
      {data && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const items = data.shifts.filter((s) => s.date === d);
            const evs = data.events.filter((e) => e.date === d);
            return (
              <section key={d} aria-label={formatISODate(d, { weekday: "long" })} className={cn("min-h-32 rounded-xl border bg-card p-2", d === today && "border-primary ring-1 ring-primary/30")}>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatISODate(d, { weekday: "short", year: undefined })}
                </h3>
                <div className="space-y-2">
                  {evs.map((e) => (
                    <EventChip key={e.id} e={e} />
                  ))}
                  {items.length === 0 && evs.length === 0 && <p className="px-1 text-xs text-muted-foreground/70">Nada programado</p>}
                  {items.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/asignaciones/?turno=${s.id}`}
                      className={cn("block rounded-lg border bg-background p-2 text-xs hover:border-primary", s.status === "cancelled" && "opacity-60 line-through")}
                    >
                      <p className="font-semibold text-foreground">
                        {formatTime(s.startAt)}–{formatTime(s.endAt)}
                      </p>
                      <p className="truncate">{s.eventName}</p>
                      <p className="truncate text-muted-foreground">{s.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-muted-foreground">
                          {s.confirmedEmployeeIds.length}/{s.requiredWorkers}
                        </span>
                        <ShiftStatusBadge status={s.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
