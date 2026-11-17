"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ErrorState, LoadingBlock } from "@/components/layout/states";
import { Avatar } from "@/features/employees/avatar";
import { useAuth } from "@/features/auth/auth-provider";
import { useAsync } from "@/hooks/use-async";
import { authService, employeeService } from "@/services";
import { profilePhoneSchema, type ProfileFormValues } from "@/schemas/employee";
import { employeeFullName, type Employee } from "@/types";
import { formatISODate } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

export default function ProfilePage() {
  const employee = useAsync(() => employeeService.getMine(), []);
  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos personales y de acceso." />
      {employee.error && <ErrorState message={employee.error} onRetry={employee.reload} />}
      {employee.loading && !employee.data && <LoadingBlock rows={3} />}
      {employee.data === null && <Alert variant="warning">No se encontró tu ficha de trabajador.</Alert>}
      {employee.data && <Profile employee={employee.data} onSaved={employee.reload} />}
    </>
  );
}

function Profile({ employee, onSaved }: { employee: Employee; onSaved: () => Promise<void> }) {
  const { session, refresh, signOut } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profilePhoneSchema),
    defaultValues: { phone: employee.phone, displayName: session?.profile?.displayName ?? employeeFullName(employee) },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <Avatar name={employeeFullName(employee)} photoURL={employee.photoURL} className="size-14 text-lg" />
          <div>
            <CardTitle>{employeeFullName(employee)}</CardTitle>
            <CardDescription>{employee.position || "Sin puesto asignado"}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Correo</dt>
            <dd>{employee.email}</dd>
            <dt className="text-muted-foreground">Incorporación</dt>
            <dd>{formatISODate(employee.hireDate)}</dd>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{employee.status === "active" ? "Activo" : "Inactivo"}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Para cambiar otros datos de tu ficha, contacta con administración.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Datos de contacto</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit(async (v) => {
              setMsg(null);
              try {
                await employeeService.updateMyProfile(v);
                await Promise.all([onSaved(), refresh()]);
                setMsg({ kind: "success", text: "Datos actualizados." });
              } catch (e) {
                setMsg({ kind: "error", text: errorMessage(e) });
              }
            })}
          >
            {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
            <FormField id="displayName" label="Nombre visible" error={errors.displayName?.message} hint="Nombre que aparece en la aplicación." required>
              <Input {...form.register("displayName")} />
            </FormField>
            <FormField id="phone" label="Teléfono" error={errors.phone?.message}>
              <Input type="tel" {...form.register("phone")} />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting}>
                Guardar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {resetSent ? (
            <Alert variant="success">Te hemos enviado un correo para cambiar la contraseña.</Alert>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await authService.sendPasswordReset(employee.email);
                  setResetSent(true);
                } catch (e) {
                  setMsg({ kind: "error", text: errorMessage(e) });
                }
              }}
            >
              <KeyRound /> Cambiar contraseña
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              router.replace("/login/");
            }}
          >
            <LogOut /> Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
