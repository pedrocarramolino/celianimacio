"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SegmentedTabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/layout/states";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { LocationFields } from "@/features/events/location-fields";
import { useAuth } from "@/features/auth/auth-provider";
import { useAsync } from "@/hooks/use-async";
import { eventService, settingsService } from "@/services";
import { settingsSchema, type SettingsFormValues } from "@/schemas/settings";
import { locationSchema, type LocationFormValues } from "@/schemas/location";
import { ROLE_LABELS, type AppUser, type CompanySettings, type Location, type UserRole } from "@/types";
import { formatDateTime } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

type Tab = "empresa" | "ubicaciones" | "usuarios" | "auditoria";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("empresa");
  return (
    <>
      <PageHeader title="Configuración" description="Parámetros de la empresa, ubicaciones, roles y registro de actividad." />
      <SegmentedTabs
        label="Secciones"
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: "empresa", label: "Empresa" },
          { value: "ubicaciones", label: "Ubicaciones" },
          { value: "usuarios", label: "Usuarios y roles" },
          { value: "auditoria", label: "Actividad" },
        ]}
      />
      {tab === "empresa" && <CompanyTab />}
      {tab === "ubicaciones" && <LocationsTab />}
      {tab === "usuarios" && <UsersTab />}
      {tab === "auditoria" && <AuditTab />}
    </>
  );
}

function CompanyTab() {
  const settings = useAsync(() => settingsService.get(), []);
  if (settings.error) return <ErrorState message={settings.error} onRetry={settings.reload} />;
  if (!settings.data) return <LoadingBlock />;
  return <CompanyForm settings={settings.data} />;
}

function CompanyForm({ settings }: { settings: CompanySettings }) {
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: settings.companyName,
      defaultRadiusMeters: String(settings.defaultRadiusMeters),
      maxAccuracyMeters: String(settings.maxAccuracyMeters),
      checkInEarlyMinutes: String(settings.checkInEarlyMinutes),
    },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Parámetros generales</CardTitle>
          <CardDescription>Zona horaria fija: Europe/Madrid.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            noValidate
            onSubmit={form.handleSubmit(async (v) => {
              setMsg(null);
              try {
                await settingsService.save(v);
                setMsg({ kind: "success", text: "Configuración guardada." });
              } catch (e) {
                setMsg({ kind: "error", text: errorMessage(e) });
              }
            })}
          >
            {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
            <FormField id="companyName" label="Nombre de la empresa" error={errors.companyName?.message} required>
              <Input {...form.register("companyName")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="defaultRadiusMeters" label="Radio por defecto (m)" error={errors.defaultRadiusMeters?.message}>
                <Input inputMode="numeric" {...form.register("defaultRadiusMeters")} />
              </FormField>
              <FormField id="maxAccuracyMeters" label="Precisión GPS máxima (m)" error={errors.maxAccuracyMeters?.message} hint="Peor precisión = incidencia.">
                <Input inputMode="numeric" {...form.register("maxAccuracyMeters")} />
              </FormField>
              <FormField id="checkInEarlyMinutes" label="Fichar antes del turno (min)" error={errors.checkInEarlyMinutes?.message} hint="Máximo 120.">
                <Input inputMode="numeric" {...form.register("checkInEarlyMinutes")} />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Guardar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LocationsTab() {
  const list = useAsync(() => eventService.listLocations(), []);
  const settings = useAsync(() => settingsService.get(), []);
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const [removing, setRemoving] = useState<Location | null>(null);
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> Nueva ubicación
        </Button>
      </div>
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data && <LoadingBlock />}
      {list.data && list.data.length === 0 && (
        <EmptyState icon={MapPin} title="Sin ubicaciones guardadas" description="Guarda los espacios habituales para reutilizarlos en los eventos." />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.map((l) => (
          <Card key={l.id}>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div className="min-w-0">
                <p className="font-medium">{l.name}</p>
                <p className="text-sm text-muted-foreground">{l.address || "Sin dirección"}</p>
                <p className="text-xs text-muted-foreground">
                  {l.lat.toFixed(5)}, {l.lng.toFixed(5)} · radio {l.radiusMeters} m
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Editar ${l.name}`} onClick={() => setEditing(l)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Eliminar ${l.name}`} onClick={() => setRemoving(l)}>
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <LocationDialog
        target={editing}
        defaultRadius={settings.data?.defaultRadiusMeters ?? 200}
        onClose={() => setEditing(null)}
        onSaved={list.reload}
      />
      <ConfirmDialog
        open={removing != null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Eliminar ubicación"
        description="Los eventos existentes conservan su copia de la ubicación; solo desaparece de la lista reutilizable."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (removing) await eventService.removeLocation(removing.id);
          await list.reload();
        }}
      />
    </>
  );
}

function LocationDialog({
  target,
  defaultRadius,
  onClose,
  onSaved,
}: {
  target: Location | "new" | null;
  defaultRadius: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const form = useForm<LocationFormValues>({ resolver: zodResolver(locationSchema) });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!target) return;
    setError(null);
    form.reset(
      target === "new"
        ? { locationName: "", address: "", lat: "", lng: "", radiusMeters: String(defaultRadius), notes: "" }
        : {
            locationName: target.name,
            address: target.address,
            lat: String(target.lat),
            lng: String(target.lng),
            radiusMeters: String(target.radiusMeters),
            notes: target.notes,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <Dialog open={target != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{target === "new" ? "Nueva ubicación" : "Editar ubicación"}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(async (v) => {
            setError(null);
            try {
              await eventService.saveLocation(target && target !== "new" ? target.id : null, v);
              onClose();
              await onSaved();
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          {error && <Alert variant="error">{error}</Alert>}
          <LocationFields register={form.register} errors={form.formState.errors} setValue={form.setValue} watch={form.watch} />
          <FormField id="loc-notes" label="Notas" error={form.formState.errors.notes?.message}>
            <Textarea rows={2} {...form.register("notes")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const { session } = useAuth();
  const users = useAsync(() => settingsService.listUsers(), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(u: AppUser, fn: () => Promise<void>) {
    setBusy(u.id);
    setError(null);
    try {
      await fn();
      await users.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Alert variant="info" title="Cómo funcionan los roles">
        El rol se guarda en <code>users/{"{uid}"}</code> y solo un administrador puede cambiarlo (lo imponen las reglas de Firestore).
        Las cuentas nuevas de trabajadores se crean mediante invitación. El primer administrador se configura según
        docs/ROLES_Y_ACCESO.md. Si se usan custom claims, prevalecen sobre este valor.
      </Alert>
      {session?.roleSource === "claims" && <Alert variant="warning">Tu rol procede de un custom claim: los cambios aquí no lo modifican.</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {users.error && <ErrorState message={users.error} onRetry={users.reload} />}
      {users.loading && !users.data && <LoadingBlock />}
      {users.data && (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Usuario</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {users.data.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-medium">
                      {u.displayName} {u.id === session?.uid && <Badge variant="outline">Tú</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TD>
                  <TD>
                    <Select
                      aria-label={`Rol de ${u.displayName}`}
                      className="w-40"
                      value={u.role}
                      disabled={busy === u.id || u.id === session?.uid}
                      onChange={(e) => act(u, () => settingsService.setRole(u, e.target.value as UserRole))}
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>{u.active ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Desactivado</Badge>}</TD>
                  <TD className="text-right">
                    {u.id !== session?.uid && (
                      <Button size="sm" variant="ghost" loading={busy === u.id} onClick={() => act(u, () => settingsService.setActive(u, !u.active))}>
                        {u.active ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  "bootstrap.admin": "Administrador configurado",
  "account.activated": "Cuenta de trabajador activada",
  "employee.created": "Trabajador creado",
  "employee.updated": "Ficha de trabajador editada",
  "employee.active": "Trabajador reactivado",
  "employee.inactive": "Trabajador desactivado",
  "invitation.created": "Invitación creada",
  "invitation.revoked": "Invitación revocada",
  "location.saved": "Ubicación guardada",
  "location.removed": "Ubicación eliminada",
  "event.created": "Evento creado",
  "event.updated": "Evento editado",
  "event.cancelled": "Evento cancelado",
  "shift.created": "Turno creado",
  "shift.updated": "Turno editado",
  "shift.cancelled": "Turno cancelado",
  "assignment.pending": "Preasignación",
  "assignment.confirmed": "Asignación confirmada",
  "assignment.cancelled": "Asignación cancelada",
  "attendance.check_in": "Fichaje de entrada",
  "attendance.break_start": "Inicio de pausa",
  "attendance.break_end": "Fin de pausa",
  "attendance.check_out": "Fichaje de salida",
  "attendance.admin_close": "Jornada cerrada por administración",
  "availability.saved": "Disponibilidad guardada",
  "settings.saved": "Configuración guardada",
  "user.role": "Cambio de rol",
  "user.activated": "Usuario activado",
  "user.deactivated": "Usuario desactivado",
};

function AuditTab() {
  const logs = useAsync(() => settingsService.recentAudit(50), []);
  if (logs.error) return <ErrorState message={logs.error} onRetry={logs.reload} />;
  if (!logs.data) return <LoadingBlock />;
  if (logs.data.length === 0)
    return (
      <EmptyState
        title="Sin actividad registrada"
        description="Aquí aparecerán las acciones realizadas en la aplicación (crear eventos, trabajadores, asignaciones, fichajes…). Los cambios hechos directamente en la consola de Firebase no se registran."
      />
    );
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Últimas 50 acciones. Registro de solo inserción; en Spark lo escribe el propio cliente, por lo que no es una auditoría a
          prueba de manipulaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {logs.data.map((l) => (
            <li key={l.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="shrink-0 text-xs text-muted-foreground sm:w-28">{formatDateTime(l.at)}</span>
              <span className="text-sm font-medium">{AUDIT_LABELS[l.action] ?? l.action}</span>
              {l.summary && <span className="min-w-0 truncate text-sm text-muted-foreground">{l.summary}</span>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
