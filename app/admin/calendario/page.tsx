"use client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { ErrorState, LoadingBlock } from "@/components/layout/states";
import { ShiftStatusBadge } from "@/components/layout/status-badges";
import { useAsync } from "@/hooks/use-async";
import { shiftService } from "@/services";
import { formatISODate, formatTime, todayISO, weekDaysISO, weekStartISO } from "@/utils/dates";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const { data, error, loading, reload } = useAsync(() => shiftService.listWeek(weekStart), [weekStart]);
  const days = weekDaysISO(weekStart);
  const today = todayISO();

  return (
    <>
      <PageHeader title="Calendario" description="Turnos de la semana y su cobertura." actions={<WeekNavigator weekStart={weekStart} onChange={setWeekStart} />} />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <LoadingBlock rows={4} />}
      {data && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const items = data.filter((s) => s.date === d);
            return (
              <section key={d} aria-label={formatISODate(d, { weekday: "long" })} className={cn("min-h-32 rounded-xl border bg-card p-2", d === today && "border-primary ring-1 ring-primary/30")}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatISODate(d, { weekday: "short", year: undefined })}
                </h2>
                <div className="space-y-2">
                  {items.length === 0 && <p className="px-1 text-xs text-muted-foreground/70">Sin turnos</p>}
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
    </>
  );
}
