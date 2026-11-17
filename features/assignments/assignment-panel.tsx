"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Search, UserPlus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ErrorState, LoadingBlock, EmptyState } from "@/components/layout/states";
import { AssignmentStatusBadge, ShiftStatusBadge } from "@/components/layout/status-badges";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { Avatar } from "@/features/employees/avatar";
import { useAsync } from "@/hooks/use-async";
import { assignmentService } from "@/services";
import type { CandidateInfo } from "@/services/assignment.service";
import { AVAILABILITY_MATCH_LABELS, type AvailabilityMatch } from "@/services/domain/availability-rules";
import { isActiveAssignment } from "@/services/domain/assignment-rules";
import { shiftWhen } from "@/services/shift.service";
import { employeeFullName, type AssignmentStatus, type Shift } from "@/types";
import { errorMessage } from "@/utils/errors";

const availabilityTone: Record<AvailabilityMatch, BadgeVariant> = {
  available: "success",
  partial_match: "success",
  unknown: "neutral",
  outside_slots: "warning",
  unavailable: "danger",
};

export function AssignmentPanel({ shift, onChanged }: { shift: Shift; onChanged: () => Promise<void> }) {
  const candidates = useAsync(() => assignmentService.candidates(shift), [shift.id, shift.updatedAt?.getTime()]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CandidateInfo | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (candidates.data ?? []).filter((c) => !t || `${employeeFullName(c.employee)} ${c.employee.position}`.toLowerCase().includes(t));
  }, [candidates.data, q]);
  const assigned = list.filter((c) => c.assignment && isActiveAssignment(c.assignment));
  const others = list.filter((c) => !c.assignment || !isActiveAssignment(c.assignment));

  async function change(c: CandidateInfo, status: AssignmentStatus, reason = "") {
    setBusy(c.employee.id);
    setError(null);
    try {
      await assignmentService.setStatus(shift, c.employee, status, reason);
      await Promise.all([candidates.reload(), onChanged()]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const row = (c: CandidateInfo) => {
    const status = c.assignment && isActiveAssignment(c.assignment) ? c.assignment.status : null;
    const blocked = c.conflicts.length > 0 && !status;
    return (
      <li key={c.employee.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={employeeFullName(c.employee)} photoURL={c.employee.photoURL} />
          <div className="min-w-0">
            <p className="truncate font-medium">{employeeFullName(c.employee)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {c.employee.position && <span className="text-xs text-muted-foreground">{c.employee.position}</span>}
              <Badge variant={availabilityTone[c.availability]}>{AVAILABILITY_MATCH_LABELS[c.availability]}</Badge>
              {status && <AssignmentStatusBadge status={status} />}
              {c.employee.status !== "active" && <Badge variant="neutral">Inactivo</Badge>}
            </div>
            {c.conflicts.map((x) => (
              <p key={x.assignmentId} className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="size-3" /> Solapa con {x.eventName} · {x.shiftName} ({shiftWhen(x)})
              </p>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!status && (
            <>
              <Button size="sm" variant="outline" disabled={blocked || c.employee.status !== "active"} loading={busy === c.employee.id} onClick={() => change(c, "pending")}>
                <UserPlus /> Preasignar
              </Button>
              <Button size="sm" disabled={blocked || c.employee.status !== "active"} loading={busy === c.employee.id} onClick={() => change(c, "confirmed")}>
                <Check /> Confirmar
              </Button>
            </>
          )}
          {status === "pending" && (
            <Button size="sm" loading={busy === c.employee.id} onClick={() => change(c, "confirmed")}>
              <Check /> Confirmar
            </Button>
          )}
          {status === "confirmed" && (
            <Button size="sm" variant="outline" loading={busy === c.employee.id} onClick={() => change(c, "pending")}>
              <Clock /> Pasar a pendiente
            </Button>
          )}
          {status && (
            <Button size="sm" variant="ghost" disabled={busy === c.employee.id} onClick={() => setCancelTarget(c)}>
              <X /> Cancelar
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>
              {shift.eventName} · {shift.name}
            </CardTitle>
            <CardDescription>
              {shiftWhen(shift)}
              {shift.position && ` · Puesto: ${shift.position}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {shift.confirmedEmployeeIds.length}/{shift.requiredWorkers} confirmados
            </span>
            <ShiftStatusBadge status={shift.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shift.status === "cancelled" && <Alert variant="warning">Turno cancelado: no admite asignaciones.</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar trabajador" placeholder="Buscar trabajador" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {candidates.error && <ErrorState message={candidates.error} onRetry={candidates.reload} />}
        {candidates.loading && !candidates.data && <LoadingBlock />}
        {candidates.data && shift.status !== "cancelled" && (
          <>
            <section>
              <h3 className="mb-1 text-sm font-semibold">Asignados ({assigned.length})</h3>
              {assigned.length === 0 ? <p className="text-sm text-muted-foreground">Nadie asignado todavía.</p> : <ul className="divide-y">{assigned.map(row)}</ul>}
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold">Disponibles para asignar</h3>
              {others.length === 0 ? <EmptyState title="No hay más trabajadores activos" /> : <ul className="divide-y">{others.map(row)}</ul>}
            </section>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancelar asignación"
        description={cancelTarget ? `Se retirará a ${employeeFullName(cancelTarget.employee)} del turno y recibirá un aviso.` : ""}
        confirmLabel="Cancelar asignación"
        destructive
        reason="optional"
        onConfirm={async (reason) => {
          if (cancelTarget) await change(cancelTarget, "cancelled", reason);
        }}
      />
    </Card>
  );
}
