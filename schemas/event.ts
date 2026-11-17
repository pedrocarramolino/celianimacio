import { z } from "zod";
import { isoDateField, optionalText, requiredText } from "./common";
import { locationFields } from "./location";

export const eventSchema = z.object({
  name: requiredText(160, "El nombre"),
  description: optionalText(4000),
  date: isoDateField,
  status: z.enum(["draft", "scheduled", "in_progress", "completed"]),
  instructions: optionalText(4000),
  locationId: z.string(),
  ...locationFields,
});
export type EventFormValues = z.infer<typeof eventSchema>;
