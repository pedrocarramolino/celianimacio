"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeFormValues } from "@/schemas/employee";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export const EMPTY_EMPLOYEE: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  hireDate: "",
  status: "active",
  photoURL: "",
  notes: "",
};

export function EmployeeForm({
  defaultValues,
  onSubmit,
  submitLabel,
  emailLocked,
  extra,
  error,
}: {
  defaultValues: EmployeeFormValues;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  submitLabel: string;
  emailLocked?: boolean;
  extra?: React.ReactNode;
  error?: string | null;
}) {
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeSchema), defaultValues });
  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="firstName" label="Nombre" error={errors.firstName?.message} required>
          <Input autoComplete="off" {...form.register("firstName")} />
        </FormField>
        <FormField id="lastName" label="Apellidos" error={errors.lastName?.message}>
          <Input autoComplete="off" {...form.register("lastName")} />
        </FormField>
        <FormField
          id="email"
          label="Correo electrónico"
          error={errors.email?.message}
          hint={emailLocked ? "Vinculado a la cuenta de acceso: no se puede cambiar." : "Se usará para la invitación de acceso."}
          required
        >
          <Input type="email" readOnly={emailLocked} {...form.register("email")} />
        </FormField>
        <FormField id="phone" label="Teléfono" error={errors.phone?.message}>
          <Input type="tel" {...form.register("phone")} />
        </FormField>
        <FormField id="position" label="Puesto de trabajo" error={errors.position?.message} hint="Ej.: Animador/a, Monitor/a, Técnico de sonido">
          <Input {...form.register("position")} />
        </FormField>
        <FormField id="hireDate" label="Fecha de incorporación" error={errors.hireDate?.message}>
          <Input type="date" {...form.register("hireDate")} />
        </FormField>
        <FormField id="status" label="Estado" error={errors.status?.message}>
          <Select {...form.register("status")}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </Select>
        </FormField>
        <FormField
          id="photoURL"
          label="Fotografía (URL, opcional)"
          error={errors.photoURL?.message}
          hint="Enlace https a una imagen. La subida de archivos requiere Storage (no disponible en Spark)."
        >
          <Input type="url" {...form.register("photoURL")} />
        </FormField>
      </div>
      <FormField id="notes" label="Notas internas" error={errors.notes?.message} hint="Solo visibles para administración.">
        <Textarea rows={3} {...form.register("notes")} />
      </FormField>
      {extra}
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
