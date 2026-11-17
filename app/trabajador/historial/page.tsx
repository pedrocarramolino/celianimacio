"use client";
import { useMemo, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { AttendanceStatusBadge } from "@/components/layout/status-badges";
import { SessionDetails } from "@/features/attendance/session-details";
import { useAsync } from "@/hooks/use-async";
import { attendanceService } from "@/services";
import { formatDateTime, formatMinutes, toISODate } from "@/utils/dates";
import { Clock, CalendarCheck } from "lucide-react";

export default function HistoryPage() {
  const list = useAsync(() => attendanceService.mySessions(), []);
  const [month, setMonth] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);

  const months = useMemo(() => [...new Set((list.data ?? []).map((s) => toISODate(s.shiftStartAt).slice(0, 7)))].sort().reverse(), [list.data]);
  const items = (list.data ?? []).filter((s) => month === "all" || toISODate(s.shiftStartAt).startsWith(month));
  const total = items.reduce((a, s) => a + (s.workedMinutes ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Historial de horas"
        description="Tus jornadas registradas."
        actions={
          <Select aria-label="Mes" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Todos los meses</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`))}
              </option>
            ))}
          </Select>
        }
      />
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <LoadingBlock />}
      {list.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Horas netas" value={formatMinutes(total)} icon={Clock} />
            <StatCard label="Jornadas" value={items.length} icon={CalendarCheck} />
          </div>
          {items.length === 0 && <EmptyState icon={History} title="Sin jornadas registradas" />}
          {items.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4">
                <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 text-left" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <div className="min-w-0">
                    <p className="font-medium">{s.eventName}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.shiftName} · {formatDateTime(s.shiftStartAt)} · {formatMinutes(s.workedMinutes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AttendanceStatusBadge status={s.status} />
                    <ChevronDown className={`size-4 transition-transform ${open === s.id ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {open === s.id && (
                  <div className="mt-4 border-t pt-4">
                    <SessionDetails session={s} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
