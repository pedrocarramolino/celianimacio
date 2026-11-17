"use client";
import { useState } from "react";
import { ChevronDown, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { AssignmentStatusBadge } from "@/components/layout/status-badges";
import { WorkerShiftDetails } from "@/features/worker/shift-details";
import { useAsync } from "@/hooks/use-async";
import { assignmentService } from "@/services";
import { formatDateTime, formatTime } from "@/utils/dates";

export default function WorkerEventsPage() {
  const list = useAsync(() => assignmentService.listMine(), []);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
  const items = (list.data ?? [])
    .filter((a) => (tab === "upcoming" ? a.shiftEndAt.getTime() > now : a.shiftEndAt.getTime() <= now))
    .sort((a, b) => (tab === "upcoming" ? 1 : -1) * (a.shiftStartAt.getTime() - b.shiftStartAt.getTime()));

  return (
    <>
      <PageHeader title="Mis eventos" description="Turnos asignados, dirección, horario e instrucciones." />
      <SegmentedTabs
        label="Periodo"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Próximos" },
          { value: "past", label: "Pasados" },
        ]}
      />
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <LoadingBlock />}
      {list.data && items.length === 0 && <EmptyState icon={PartyPopper} title={tab === "upcoming" ? "No tienes turnos próximos" : "Sin turnos pasados"} />}
      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
                aria-expanded={open === a.id}
                onClick={() => setOpen(open === a.id ? null : a.id)}
              >
                <div className="min-w-0">
                  <p className="font-medium">{a.eventName}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.shiftName} · {formatDateTime(a.shiftStartAt)}–{formatTime(a.shiftEndAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AssignmentStatusBadge status={a.status} />
                  <ChevronDown className={`size-4 transition-transform ${open === a.id ? "rotate-180" : ""}`} />
                </div>
              </button>
              {open === a.id && (
                <div className="mt-4 border-t pt-4">
                  {tab === "past" && a.status !== "cancelled" ? (
                    <p className="text-sm text-muted-foreground">Turno finalizado. Consulta tus horas en Historial.</p>
                  ) : (
                    <WorkerShiftDetails assignment={a} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
