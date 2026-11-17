"use client";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { ErrorState, LoadingBlock, EmptyState } from "@/components/layout/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { WeekEditor } from "@/features/availability/week-editor";
import { useAsync } from "@/hooks/use-async";
import { availabilityService, employeeService, notificationService } from "@/services";
import { notificationTemplates } from "@/services/notification.service";
import { employeeFullName, type DayAvailability, type Employee } from "@/types";
import { formatISODate, todayISO, weekDaysISO, weekStartISO } from "@/utils/dates";
import { cn } from "@/lib/utils";

const cellTone = {
  unset: "bg-muted text-muted-foreground",
  available: "bg-success-soft text-success",
  partial: "bg-primary-soft text-primary",
  unavailable: "bg-danger-soft text-destructive",
};

function cellText(d: DayAvailability | undefined): string {
  if (!d || d.status === "unset") return "—";
  if (d.status === "available") return "Todo el día";
  if (d.status === "unavailable") return "No";
  return d.slots.map((s) => `${s.start}–${s.end}`).join(" · ");
}

export default function AdminAvailabilityPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const [day, setDay] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const days = weekDaysISO(weekStart);

  const data = useAsync(async () => {
    const [employees, weeks] = await Promise.all([employeeService.listActive(), availabilityService.listWeek(weekStart)]);
    return { employees, weeks: new Map(weeks.map((w) => [w.employeeId, w])) };
  }, [weekStart]);

  const rows = useMemo(() => {
    if (!data.data) return [];
    let list = data.data.employees;
    if (employeeId !== "all") list = list.filter((e) => e.id === employeeId);
    if (day !== "all") {
      const idx = days.indexOf(day);
      list = list.filter((e) => {
        const d = data.data!.weeks.get(e.id)?.days[idx];
        return d && (d.status === "available" || d.status === "partial");
      });
    }
    return list;
  }, [data.data, employeeId, day, days]);

  const visibleDays = day === "all" ? days : [day];
  const missing = data.data ? data.data.employees.filter((e) => !data.data!.weeks.has(e.id)) : [];

  return (
    <>
      <PageHeader
        title="Disponibilidad del equipo"
        description="Consulta y filtra la disponibilidad declarada por semana, día y trabajador."
        actions={
          <>
            <WeekNavigator weekStart={weekStart} onChange={(w) => { setWeekStart(w); setDay("all"); setSent(null); }} />
            <Button variant="outline" onClick={() => setRequestOpen(true)} disabled={!data.data || missing.length === 0}>
              <Send /> Solicitar ({missing.length})
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select aria-label="Día" className="sm:w-56" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="all">Toda la semana</option>
          {days.map((d) => (
            <option key={d} value={d}>
              Disponibles el {formatISODate(d, { weekday: "long", year: undefined })}
            </option>
          ))}
        </Select>
        <Select aria-label="Trabajador" className="sm:w-64" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="all">Todos los trabajadores</option>
          {data.data?.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {employeeFullName(e)}
            </option>
          ))}
        </Select>
      </div>
      {sent != null && <Alert variant="success" className="mb-4">Solicitud enviada como notificación interna a {sent} trabajador(es).</Alert>}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.loading && !data.data && <LoadingBlock rows={5} />}
      {data.data && rows.length === 0 && <EmptyState title="Nadie coincide con el filtro" />}
      {data.data && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Trabajador</th>
                {visibleDays.map((d) => (
                  <th key={d} className="px-2 py-2.5 font-medium">
                    {formatISODate(d, { weekday: "short", year: undefined })}
                  </th>
                ))}
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => {
                const w = data.data!.weeks.get(e.id);
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{employeeFullName(e)}</p>
                      {!w && <p className="text-xs text-warning">Sin indicar</p>}
                      {w?.note && <p className="max-w-48 truncate text-xs text-muted-foreground" title={w.note}>{w.note}</p>}
                    </td>
                    {visibleDays.map((d) => {
                      const cell = w?.days[days.indexOf(d)];
                      return (
                        <td key={d} className="px-1.5 py-2">
                          <span className={cn("block rounded-md px-2 py-1.5 text-center text-xs font-medium", cellTone[cell?.status ?? "unset"])}>{cellText(cell)}</span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Disponibilidad de {editing ? employeeFullName(editing) : ""}</DialogTitle>
            <DialogDescription>Registra la disponibilidad que te ha comunicado el trabajador.</DialogDescription>
          </DialogHeader>
          {editing && (
            <WeekEditor
              weekStart={weekStart}
              initial={data.data?.weeks.get(editing.id) ?? null}
              readOnlyPast={false}
              onSave={async (d, note) => {
                await availabilityService.saveFor(editing.id, weekStart, d, note);
                await data.reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Solicitar disponibilidad"
        description={`Se enviará una notificación interna a ${missing.length} trabajador(es) que aún no han indicado su disponibilidad para esta semana. No se envía correo electrónico.`}
        confirmLabel="Enviar solicitud"
        onConfirm={async () => {
          const label = formatISODate(weekStart);
          await notificationService.send(missing.map((e) => notificationTemplates.availabilityRequest(e.id, label)));
          setSent(missing.length);
        }}
      />
    </>
  );
}
