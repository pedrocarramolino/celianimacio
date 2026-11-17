"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Mail, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, FullScreenLoader, LoadingBlock } from "@/components/layout/states";
import { AssignmentStatusBadge, AttendanceStatusBadge } from "@/components/layout/status-badges";
import { EmployeeForm } from "@/features/employees/employee-form";
import { Avatar } from "@/features/employees/avatar";
import { useAsync } from "@/hooks/use-async";
import { employeeService } from "@/services";
import { employeeToForm } from "@/services/employee.service";
import { employeeFullName, INCIDENT_LABELS, ROLE_LABELS, type Employee } from "@/types";
import { formatDateTime, formatMinutes, formatTime } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <EmployeeDetail />
    </Suspense>
  );
}

function EmployeeDetail() {
  const id = useSearchParams().get("id") ?? "";
  const employee = useAsync(() => employeeService.get(id), [id], Boolean(id));
  const [tab, setTab] = useState<"ficha" | "acceso" | "historial">("ficha");

  if (!id) return <ErrorState message="Falta el identificador del trabajador." />;
  if (employee.error) return <ErrorState message={employee.error} onRetry={employee.reload} />;
  if (!employee.data) return <LoadingBlock rows={5} />;
  const e = employee.data;

  return (
    <>
      <Link href="/admin/trabajadores/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Trabajadores
      </Link>
      <PageHeader
        title={employeeFullName(e)}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {e.position || "Sin puesto"} ·
            <Badge variant={e.status === "active" ? "default" : "neutral"}>{e.status === "active" ? "Activo" : "Inactivo"}</Badge>
            {e.userId ? <Badge variant="success">Cuenta activada</Badge> : <Badge variant="neutral">Sin cuenta</Badge>}
          </span>
        }
        actions={<Avatar name={employeeFullName(e)} photoURL={e.photoURL} className="size-14 text-lg" />}
      />
      <SegmentedTabs
        label="Secciones"
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: "ficha", label: "Ficha" },
          { value: "acceso", label: "Acceso" },
          { value: "historial", label: "Historial" },
        ]}
      />
      {tab === "ficha" && <ProfileTab employee={e} onSaved={employee.reload} />}
      {tab === "acceso" && <AccessTab employee={e} onChanged={employee.reload} />}
      {tab === "historial" && <HistoryTab employee={e} />}
    </>
  );
}

function ProfileTab({ employee, onSaved }: { employee: Employee; onSaved: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <Card>
      <CardContent className="pt-5">
        {saved && <Alert variant="success" className="mb-4">Cambios guardados.</Alert>}
        <EmployeeForm
          key={employee.updatedAt?.getTime() ?? 0}
          defaultValues={employeeToForm(employee)}
          emailLocked={Boolean(employee.userId)}
          submitLabel="Guardar cambios"
          error={error}
          onSubmit={async (values) => {
            setError(null);
            setSaved(false);
            try {
              await employeeService.update(employee.id, values);
              setSaved(true);
              await onSaved();
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function AccessTab({ employee, onChanged }: { employee: Employee; onChanged: () => Promise<void> }) {
  const invitations = useAsync(() => employeeService.invitationsFor(employee.id), [employee.id]);
  const user = useAsync(() => employeeService.linkedUser(employee), [employee.id, employee.userId]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pending = invitations.data?.find((i) => i.status === "pending");
  const activateUrl = typeof window !== "undefined" ? `${window.location.origin}/activar/` : "/activar/";
  const message = `Hola ${employee.firstName}, te hemos dado de alta en la plataforma de Cel i Animació. Activa tu acceso en ${activateUrl} creando una cuenta con este correo (${employee.email}) y verificándolo.`;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await Promise.all([invitations.reload(), onChanged()]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cuenta de acceso</CardTitle>
          <CardDescription>Estado de la vinculación entre la ficha y Firebase Authentication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {employee.userId ? (
            <div className="space-y-2 text-sm">
              <p>
                Cuenta vinculada: <strong>{user.data?.email ?? employee.email}</strong>
              </p>
              {user.data && (
                <p className="text-muted-foreground">
                  Rol: {ROLE_LABELS[user.data.role]} · {user.data.active ? "Acceso activo" : "Acceso desactivado"}
                </p>
              )}
            </div>
          ) : pending ? (
            <div className="space-y-3">
              <Alert variant="info" title="Invitación pendiente">
                El trabajador debe crear su cuenta en <code>/activar</code> con <strong>{pending.email}</strong> y verificar el correo.
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(message);
                    setCopied(true);
                  }}
                >
                  <Copy /> {copied ? "Copiado" : "Copiar mensaje"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${employee.email}?subject=${encodeURIComponent("Acceso a Cel i Animació")}&body=${encodeURIComponent(message)}`}>
                    <Mail /> Abrir en mi correo
                  </a>
                </Button>
                <Button variant="ghost" size="sm" loading={busy === "revoke"} onClick={() => run("revoke", () => employeeService.revokeInvitation(pending))}>
                  Revocar invitación
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No hay invitación pendiente para esta ficha.</p>
              <Button size="sm" loading={busy === "invite"} onClick={() => run("invite", () => employeeService.invite(employee))}>
                Crear invitación
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Estado laboral</CardTitle>
          <CardDescription>Un trabajador inactivo no puede iniciar sesión en el portal ni ser asignado.</CardDescription>
        </CardHeader>
        <CardContent>
          {employee.status === "active" ? (
            <Button variant="outline" loading={busy === "status"} onClick={() => run("status", () => employeeService.setStatus(employee, "inactive"))}>
              <UserX /> Marcar como inactivo
            </Button>
          ) : (
            <Button loading={busy === "status"} onClick={() => run("status", () => employeeService.setStatus(employee, "active"))}>
              <UserCheck /> Reactivar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab({ employee }: { employee: Employee }) {
  const history = useAsync(() => employeeService.history(employee.id), [employee.id]);
  if (history.error) return <ErrorState message={history.error} onRetry={history.reload} />;
  if (!history.data) return <LoadingBlock />;
  const { assignments, sessions } = history.data;
  const total = sessions.reduce((a, s) => a + (s.workedMinutes ?? 0), 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Eventos y turnos</CardTitle>
          <CardDescription>{assignments.length} asignación(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState title="Sin asignaciones" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Evento</TH>
                  <TH>Turno</TH>
                  <TH>Horario</TH>
                  <TH>Estado</TH>
                </tr>
              </THead>
              <TBody>
                {assignments.map((a) => (
                  <TR key={a.id}>
                    <TD>{a.eventName}</TD>
                    <TD>{a.shiftName}</TD>
                    <TD className="whitespace-nowrap">
                      {formatDateTime(a.shiftStartAt)}–{formatTime(a.shiftEndAt)}
                    </TD>
                    <TD>
                      <AssignmentStatusBadge status={a.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Horas trabajadas</CardTitle>
          <CardDescription>Total registrado: {formatMinutes(total)}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <EmptyState title="Sin fichajes" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Turno</TH>
                  <TH>Entrada</TH>
                  <TH>Salida</TH>
                  <TH>Neto</TH>
                  <TH>Estado</TH>
                </tr>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <p>{s.eventName}</p>
                      <p className="text-xs text-muted-foreground">{s.shiftName}</p>
                      {s.hasIncident && <p className="text-xs text-warning">{s.incidents.map((i) => INCIDENT_LABELS[i.type]).join(", ")}</p>}
                    </TD>
                    <TD className="whitespace-nowrap">{formatDateTime(s.checkIn.serverAt ?? s.checkIn.clientAt)}</TD>
                    <TD className="whitespace-nowrap">{formatDateTime(s.checkOut?.serverAt ?? s.checkOut?.clientAt)}</TD>
                    <TD className="whitespace-nowrap">{formatMinutes(s.workedMinutes)}</TD>
                    <TD>
                      <AttendanceStatusBadge status={s.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
