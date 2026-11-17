import { z } from "zod";
import { emailField, optionalIsoDateField, optionalText, requiredText } from "./common";

export const employeeSchema = z.object({
  firstName: requiredText(80, "El nombre"),
  lastName: optionalText(120),
  email: emailField,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^[+0-9 ()-]{6,30}$/.test(v), "Teléfono no válido."),
  position: optionalText(80),
  hireDate: optionalIsoDateField,
  status: z.enum(["active", "inactive"]),
  photoURL: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === "" || /^https:\/\/.+/.test(v), "Debe ser una URL https://"),
  notes: optionalText(2000),
});
export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const profilePhoneSchema = z.object({
  phone: employeeSchema.shape.phone,
  displayName: requiredText(120, "El nombre visible"),
});
export type ProfileFormValues = z.infer<typeof profilePhoneSchema>;
