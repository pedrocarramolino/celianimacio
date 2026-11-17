"use client";
import { useState } from "react";
import { MapPinCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClockPanel } from "@/features/attendance/clock-panel";
import { useAsync } from "@/hooks/use-async";
import { assignmentService, attendanceService } from "@/services";
import { formatDateTime, formatTime } from "@/utils/dates";

const HOUR = 3600_000;

export default function ClockPage() {
  const data = useAsync(async () => {
    const [settings, assignments, sessions] = await Promise.all([
      attendanceService.loadSettings(),
      assignmentService.listMine(),
      attendanceService.mySessions(),
    ]);
    const now = Date.now();
    const openShiftIds = new Set(sessions.filter((s) => s.status !== "closed").map((s) => s.shiftId));
    const relevant = assignments
      .filter(
        (a) =>
          a.status === "confirmed" &&
          (openShiftIds.has(a.shiftId) ||
            (a.shiftStartAt.getTime() - 12 * HOUR <= now && a.shiftEndAt.getTime() + 2 * HOUR >= now)),
      )
      .sort((a, b) => Number(openShiftIds.has(b.shiftId)) - Number(openShiftIds.has(a.shiftId)) || a.shiftStartAt.getTime() - b.shiftStartAt.getTime());
    return { settings, relevant };
  }, []);
  const [selected, setSelected] = useState<string | null>(null);

  const list = data.data?.relevant ?? [];
  const current = list.find((a) => a.id === selected) ?? list[0];

  return (
    <>
      <PageHeader title="Fichar" description="Entrada, pausas y salida de tus turnos confirmados." />
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.loading && !data.data && <LoadingBlock rows={3} />}
      {data.data && list.length === 0 && (
        <EmptyState icon={MapPinCheck} title="No tienes turnos para fichar ahora" description="Aquí aparecerán tus turnos confirmados desde unas horas antes de su inicio." />
      )}
      {data.data && list.length > 1 && (
        <div className="mb-4 max-w-md space-y-1.5">
          <Label htmlFor="shift-select">Turno</Label>
          <Select id="shift-select" value={current?.id} onChange={(e) => setSelected(e.target.value)}>
            {list.map((a) => (
              <option key={a.id} value={a.id}>
                {a.eventName} · {formatDateTime(a.shiftStartAt)}–{formatTime(a.shiftEndAt)}
              </option>
            ))}
          </Select>
        </div>
      )}
      {data.data && current && (
        <div className="mx-auto max-w-xl">
          <ClockPanel key={current.id} assignment={current} settings={data.data.settings} onChanged={() => undefined} />
        </div>
      )}
    </>
  );
}
