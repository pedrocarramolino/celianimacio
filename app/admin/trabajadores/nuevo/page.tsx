"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm, EMPTY_EMPLOYEE } from "@/features/employees/employee-form";
import { employeeService } from "@/services";
import { errorMessage } from "@/utils/errors";

export default function NewEmployeePage() {
  const router = useRouter();
  const [invite, setInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Nuevo trabajador" description="Crea la ficha laboral. El acceso se activa mediante invitación." />
      <Card>
        <CardContent className="pt-5">
          <EmployeeForm
            defaultValues={EMPTY_EMPLOYEE}
            submitLabel="Crear trabajador"
            error={error}
            onSubmit={async (values) => {
              setError(null);
              try {
                const id = await employeeService.create(values, { invite });
                router.push(`/admin/trabajadores/ficha/?id=${id}`);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
            extra={
              <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
                <span>
                  <span className="font-medium">Crear invitación de acceso</span>
                  <span className="block text-muted-foreground">
                    El trabajador podrá activar su cuenta en <code>/activar</code> con este correo tras verificarlo. La aplicación no envía el
                    correo automáticamente: deberás comunicarle el enlace.
                  </span>
                </span>
              </label>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
