"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, type EventFormValues } from "@/schemas/event";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationFields } from "./location-fields";
import type { Location } from "@/types";

export function emptyEvent(defaultRadius: number, date: string): EventFormValues {
  return {
    name: "",
    description: "",
    date,
    status: "scheduled",
    instructions: "",
    locationId: "",
    locationName: "",
    address: "",
    lat: "",
    lng: "",
    radiusMeters: String(defaultRadius),
  };
}

export function EventForm({
  defaultValues,
  locations,
  onSubmit,
  submitLabel,
  error,
}: {
  defaultValues: EventFormValues;
  locations: Location[];
  onSubmit: (v: EventFormValues) => Promise<void>;
  submitLabel: string;
  error?: string | null;
}) {
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventSchema), defaultValues });
  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Datos del evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="name" label="Nombre" error={errors.name?.message} required className="sm:col-span-2">
              <Input {...form.register("name")} />
            </FormField>
            <FormField id="date" label="Fecha del evento" error={errors.date?.message} required>
              <Input type="date" {...form.register("date")} />
            </FormField>
            <FormField id="status" label="Estado" error={errors.status?.message}>
              <Select {...form.register("status")}>
                <option value="draft">Borrador</option>
                <option value="scheduled">Programado</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Finalizado</option>
              </Select>
            </FormField>
          </div>
          <FormField id="description" label="Descripción" error={errors.description?.message}>
            <Textarea rows={3} {...form.register("description")} />
          </FormField>
          <FormField id="instructions" label="Instrucciones para el personal" error={errors.instructions?.message} hint="Visibles para los trabajadores asignados.">
            <Textarea rows={4} {...form.register("instructions")} />
          </FormField>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ubicación y radio de fichaje</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationFields register={form.register} errors={errors} setValue={form.setValue} watch={form.watch} locations={locations} withPicker />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
