import { z } from "zod";
import { clockField, isoDateField, numericString, optionalText, requiredText } from "./common";
import { locationFields } from "./location";

export const shiftSchema = z
  .object({
    name: requiredText(120, "El nombre del turno"),
    date: isoDateField,
    startTime: clockField,
    endTime: clockField,
    requiredWorkers: numericString({ min: 1, max: 200, label: "El número de trabajadores", integer: true }),
    position: optionalText(80),
    instructions: optionalText(4000),
    useEventLocation: z.boolean(),
    locationName: z.string(),
    address: z.string(),
    lat: z.string(),
    lng: z.string(),
    radiusMeters: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.startTime === v.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "La hora de fin debe ser distinta a la de inicio." });
    }
    if (!v.useEventLocation) {
      const sub = z.object(locationFields).safeParse(v);
      if (!sub.success) {
        for (const issue of sub.error.issues) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
    }
  });
export type ShiftFormValues = z.infer<typeof shiftSchema>;
