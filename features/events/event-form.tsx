"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { eventSchema, type EventFormValues } from "@/schemas/event";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationFields } from "./location-fields";
import { EVENT_NAME_HINT } from "@/lib/brand";
import { EVENT_CATEGORIES, EVENT_CATEGORY_EMOJI, EVENT_CATEGORY_LABELS, type Location } from "@/types";

export function emptyEvent(defaultRadius: number, date: string): EventFormValues {
  return {
    name: "",
    description: "",
    date,
    status: "scheduled",
    // Sin valor inicial: obliga a elegir el tipo (Zod lo valida).
    category: "" as unknown as EventFormValues["category"],
    instructions: "",
    locationId: "",
    locationName: "",
    address: "",
    lat: "",
    lng: "",
    radiusMeters: String(defaultRadius),
    meetingTime: "",
    meetingPlace: "Nave",
    startTime: "",
    endTime: "",
    room: "",
    kids: "",
    ages: "",
    dressCode: "",
    material: "",
    contactPhone: "",
    totalPrice: "",
    paidAmount: "",
    extraHour: "",
    adminNotes: "",
    createShift: true,
    monitors: "2",
  };
}

export function EventForm({
  defaultValues,
  locations,
  onSubmit,
  submitLabel,
  error,
  isNew = false,
}: {
  defaultValues: EventFormValues;
  locations: Location[];
  onSubmit: (v: EventFormValues) => Promise<void>;
  submitLabel: string;
  error?: string | null;
  isNew?: boolean;
}) {
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventSchema), defaultValues });
  const { errors, isSubmitting } = form.formState;
  const createShift = form.watch("createShift");
  const meetingTime = form.watch("meetingTime");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Datos del evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="name" label="Nombre" error={errors.name?.message} hint={EVENT_NAME_HINT} required className="sm:col-span-2">
              <Input {...form.register("name")} />
            </FormField>
            <FormField id="category" label="Tipo de evento" error={errors.category?.message} required>
              <Select {...form.register("category")}>
                <option value="" disabled>
                  Elige el tipo…
                </option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EVENT_CATEGORY_EMOJI[c]} {EVENT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="date" label="Fecha del evento" error={errors.date?.message} required>
              <Input type="date" {...form.register("date")} />
            </FormField>
            <FormField id="status" label="Estado" error={errors.status?.message} className="sm:col-span-2">
              <Select {...form.register("status")}>
                <option value="draft">Borrador</option>
                <option value="scheduled">Programado</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Finalizado</option>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ficha del evento</CardTitle>
          <CardDescription>La verá el equipo asignado en su móvil (incluido el precio, para cobrar horas extra o lo pendiente).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField id="meetingTime" label="Hora nave" error={errors.meetingTime?.message} hint="Quedada para cargar material">
              <Input type="time" {...form.register("meetingTime")} />
            </FormField>
            <FormField id="meetingPlace" label="Lugar de quedada" error={errors.meetingPlace?.message}>
              <Input {...form.register("meetingPlace")} />
            </FormField>
            <FormField id="startTime" label="Hora evento: inicio" error={errors.startTime?.message}>
              <Input type="time" {...form.register("startTime")} />
            </FormField>
            <FormField id="endTime" label="Hora evento: fin" error={errors.endTime?.message}>
              <Input type="time" {...form.register("endTime")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="room" label="Estancia" error={errors.room?.message} hint="Sala o zona dentro del lugar">
              <Input {...form.register("room")} />
            </FormField>
            <FormField id="contactPhone" label="Teléfono de contacto" error={errors.contactPhone?.message} hint="Visible para el equipo asignado">
              <Input type="tel" {...form.register("contactPhone")} />
            </FormField>
            <FormField id="kids" label="Niños (xiquets)" error={errors.kids?.message}>
              <Input inputMode="numeric" {...form.register("kids")} />
            </FormField>
            <FormField id="ages" label="Edades" error={errors.ages?.message} hint="Ej.: 4 a 10 años">
              <Input {...form.register("ages")} />
            </FormField>
            <FormField id="dressCode" label="Vestimenta" error={errors.dressCode?.message} className="sm:col-span-2">
              <Input {...form.register("dressCode")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField id="totalPrice" label="Precio total (€)" error={errors.totalPrice?.message}>
              <Input inputMode="decimal" {...form.register("totalPrice")} />
            </FormField>
            <FormField id="paidAmount" label="Pagado / señal (€)" error={errors.paidAmount?.message}>
              <Input inputMode="decimal" {...form.register("paidAmount")} />
            </FormField>
            <FormField id="extraHour" label="Hora extra" error={errors.extraHour?.message} hint="Ej.: 50 €/h" className="col-span-2 sm:col-span-1">
              <Input {...form.register("extraHour")} />
            </FormField>
          </div>
          <FormField id="material" label="Observaciones / material" error={errors.material?.message} hint="Ej.: Zona infantil · Juegos deportivos · Mini pack juegos gigantes · 4 en 1 · Altavoz">
            <Textarea rows={3} {...form.register("material")} />
          </FormField>
          <FormField id="instructions" label="Instrucciones para el personal" error={errors.instructions?.message}>
            <Textarea rows={3} {...form.register("instructions")} />
          </FormField>
          <FormField id="description" label="Descripción interna" error={errors.description?.message}>
            <Textarea rows={2} {...form.register("description")} />
          </FormField>
        </CardContent>
      </Card>

      {isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Equipo de monitores</CardTitle>
            <CardDescription>Crea el turno para poder asignar a los monitores directamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register("createShift")} />
              <span>
                <span className="font-medium">Crear turno automáticamente</span>
                <span className="block text-muted-foreground">
                  {createShift && (startTime || meetingTime) && endTime
                    ? `Turno de ${meetingTime || startTime} a ${endTime}${meetingTime ? " (desde la hora de nave)" : ""}.`
                    : "Desde la hora de nave (o de inicio) hasta el fin del evento."}
                </span>
              </span>
            </label>
            {createShift && (
              <FormField id="monitors" label="Monitores necesarios" error={errors.monitors?.message} className="max-w-48">
                <Input inputMode="numeric" {...form.register("monitors")} />
              </FormField>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ubicación y radio de fichaje</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationFields register={form.register} errors={errors} setValue={form.setValue} watch={form.watch} locations={locations} withPicker />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" /> Solo administración
          </CardTitle>
          <CardDescription>El equipo no ve estas notas.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField id="adminNotes" label="Notas internas" error={errors.adminNotes?.message}>
            <Textarea rows={2} {...form.register("adminNotes")} />
          </FormField>
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
