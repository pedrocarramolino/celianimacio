"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shiftSchema, type ShiftFormValues } from "@/schemas/shift";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LocationFields } from "./location-fields";
import { POSITION_SUGGESTIONS, SHIFT_NAME_SUGGESTIONS } from "@/lib/brand";
import type { CompanyEvent } from "@/types";
import { errorMessage } from "@/utils/errors";

export function emptyShift(event: CompanyEvent): ShiftFormValues {
  return {
    name: "",
    date: event.date,
    startTime: "10:00",
    endTime: "14:00",
    requiredWorkers: "1",
    position: "",
    instructions: "",
    useEventLocation: true,
    locationName: "",
    address: "",
    lat: "",
    lng: "",
    radiusMeters: String(event.location.radiusMeters),
  };
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  warning,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  defaultValues: ShiftFormValues;
  onSubmit: (v: ShiftFormValues) => Promise<void>;
  warning?: string;
}) {
  const form = useForm<ShiftFormValues>({ resolver: zodResolver(shiftSchema), defaultValues });
  const [error, setError] = useState<string | null>(null);
  const { errors, isSubmitting } = form.formState;
  const useEventLocation = form.watch("useEventLocation");

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await onSubmit(v);
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Si la hora de fin es anterior a la de inicio, el turno termina al día siguiente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Alert variant="error">{error}</Alert>}
          {warning && <Alert variant="warning">{warning}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="shift-name" label="Nombre del turno" error={errors.name?.message} hint="Elige una sugerencia o escribe otro nombre." required className="sm:col-span-2">
              <Input list="shift-name-suggestions" autoComplete="off" {...form.register("name")} />
            </FormField>
            <FormField id="shift-date" label="Fecha" error={errors.date?.message} required>
              <Input type="date" {...form.register("date")} />
            </FormField>
            <FormField id="shift-required" label="Trabajadores necesarios" error={errors.requiredWorkers?.message} required>
              <Input inputMode="numeric" {...form.register("requiredWorkers")} />
            </FormField>
            <FormField id="shift-start" label="Hora de inicio" error={errors.startTime?.message} required>
              <Input type="time" {...form.register("startTime")} />
            </FormField>
            <FormField id="shift-end" label="Hora de fin" error={errors.endTime?.message} required>
              <Input type="time" {...form.register("endTime")} />
            </FormField>
            <FormField id="shift-position" label="Puesto requerido" error={errors.position?.message} className="sm:col-span-2">
              <Input list="shift-position-suggestions" autoComplete="off" {...form.register("position")} />
            </FormField>
            <datalist id="shift-name-suggestions">
              {SHIFT_NAME_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <datalist id="shift-position-suggestions">
              {POSITION_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <FormField id="shift-instructions" label="Instrucciones del turno" error={errors.instructions?.message}>
            <Textarea rows={3} {...form.register("instructions")} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register("useEventLocation")} />
            Usar la ubicación del evento
          </label>
          {!useEventLocation && (
            <div className="rounded-lg border p-4">
              <LocationFields register={form.register} errors={errors} setValue={form.setValue} watch={form.watch} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar turno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
