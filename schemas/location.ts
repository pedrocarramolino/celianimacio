import { z } from "zod";
import { numericString, optionalText, requiredText } from "./common";

export const locationFields = {
  locationName: requiredText(160, "El nombre del lugar"),
  address: optionalText(300),
  lat: numericString({ min: -90, max: 90, label: "La latitud" }),
  lng: numericString({ min: -180, max: 180, label: "La longitud" }),
  radiusMeters: numericString({ min: 10, max: 5000, label: "El radio", integer: true }),
};

export const locationSchema = z.object({ ...locationFields, notes: optionalText(1000) });
export type LocationFormValues = z.infer<typeof locationSchema>;
