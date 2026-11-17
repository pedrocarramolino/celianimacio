"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { EmptyState, ErrorState, FullScreenLoader, LoadingBlock } from "@/components/layout/states";
import { ShiftStatusBadge } from "@/components/layout/status-badges";
import { Select } from "@/components/ui/input";
import { AssignmentPanel } from "@/features/assignments/assignment-panel";
import { useAsync } from "@/hooks/use-async";
import { shiftService } from "@/services";
import { formatISODate, formatTime, todayISO, weekStartISO } from "@/utils/dates";
import { cn } from "@/lib/utils";

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Assignments />
    </Suspense>
  );
}

function Assignments() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("turno");
  const selected = useAsync(() => shiftService.get(selectedId ?? ""), [selectedId], Boolean(selectedId));
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (selected.data) setWeekStart(weekStartISO(selected.data.date));
  }, [selected.data]);

  const shifts = useAsync(() => shiftService.listWeek(weekStart), [weekStart]);
  const visible = (shifts.data ?? []).filter((s) => s.status !== "cancelled" && (filter === "all" || s.status !== "filled"));

  return (
    <>
      <PageHeader title="Asignaciones" description="Selecciona un turno y asigna personal según su disponibilidad." actions={<WeekNavigator weekStart={weekStart} onChange={setWeekStart} />} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <Select aria-label="Filtrar turnos" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="pending">Pendientes de cubrir</option>
            <option value="all">Todos los turnos</option>
          </Select>
          {shifts.error && <ErrorState message={shifts.error} onRetry={shifts.reload} />}
          {shifts.loading && !shifts.data && <LoadingBlock />}
          {shifts.data && visible.length === 0 && <EmptyState title="Sin turnos esta semana" />}
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => router.replace(`/admin/asignaciones/?turno=${s.id}`)}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border bg-card p-3 text-left text-sm hover:border-primary",
                    selectedId === s.id && "border-primary ring-1 ring-primary/30",
                  )}
                  aria-current={selectedId === s.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{s.eventName}</p>
                    <ShiftStatusBadge status={s.status} />
                  </div>
                  <p className="text-muted-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatISODate(s.date, { weekday: "short", year: undefined })} · {formatTime(s.startAt)}–{formatTime(s.endAt)} ·{" "}
                    {s.confirmedEmployeeIds.length}/{s.requiredWorkers}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div>
          {!selectedId && <EmptyState icon={ClipboardCheck} title="Selecciona un turno" description="Verás la disponibilidad del equipo y las incompatibilidades horarias antes de asignar." />}
          {selected.error && <ErrorState message={selected.error} onRetry={selected.reload} />}
          {selectedId && selected.loading && !selected.data && <LoadingBlock rows={5} />}
          {selected.data && (
            <AssignmentPanel
              shift={selected.data}
              onChanged={async () => {
                await Promise.all([selected.reload(), shifts.reload()]);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
