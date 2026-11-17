import { z } from "zod";
import { clockField, isoDateField, optionalText } from "./common";

export const slotSchema = z
  .object({ start: clockField, end: clockField })
  .refine((s) => s.end > s.start, { message: "La hora de fin debe ser posterior al inicio.", path: ["end"] });

export const daySchema = z.object({
  date: isoDateField,
  status: z.enum(["unset", "available", "partial", "unavailable"]),
  slots: z.array(slotSchema).max(6, "Máximo 6 franjas por día."),
});

export const weekAvailabilitySchema = z.object({
  weekStart: isoDateField,
  days: z.array(daySchema).length(7),
  note: optionalText(1000),
});
export type WeekAvailabilityValues = z.infer<typeof weekAvailabilitySchema>;
