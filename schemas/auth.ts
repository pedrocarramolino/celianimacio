import { z } from "zod";
import { emailField } from "./common";

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "La contraseña es obligatoria."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const resetSchema = z.object({ email: emailField });
export type ResetValues = z.infer<typeof resetSchema>;

export const registerSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .max(128)
      .regex(/[A-Za-z]/, "Debe incluir al menos una letra.")
      .regex(/[0-9]/, "Debe incluir al menos un número."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden." });
export type RegisterValues = z.infer<typeof registerSchema>;
