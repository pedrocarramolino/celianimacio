import { z } from "zod";
import { numericString, requiredText } from "./common";

export const settingsSchema = z.object({
  companyName: requiredText(120, "El nombre"),
  defaultRadiusMeters: numericString({ min: 10, max: 5000, label: "El radio", integer: true }),
  maxAccuracyMeters: numericString({ min: 5, max: 2000, label: "La precisión", integer: true }),
  checkInEarlyMinutes: numericString({ min: 0, max: 120, label: "El margen", integer: true }),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;
