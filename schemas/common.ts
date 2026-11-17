import { z } from "zod";
import { isClockTime, isISODate } from "../utils/dates";

export const requiredText = (max: number, label = "Este campo") =>
  z.string().trim().min(1, `${label} es obligatorio.`).max(max, `Máximo ${max} caracteres.`);
export const optionalText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
export const emailField = z.string().trim().min(1, "El correo es obligatorio.").email("Introduce un correo válido.").max(254);
export const isoDateField = z.string().refine(isISODate, "Fecha no válida.");
export const optionalIsoDateField = z.string().refine((v) => v === "" || isISODate(v), "Fecha no válida.");
export const clockField = z.string().refine(isClockTime, "Hora no válida (HH:mm).");

/** Número introducido en un <input> de texto/número. */
export const numericString = (opts: { min: number; max: number; label: string; integer?: boolean }) =>
  z
    .string()
    .trim()
    .min(1, `${opts.label} es obligatorio.`)
    .refine((v) => !Number.isNaN(Number(v.replace(",", "."))), `${opts.label} debe ser un número.`)
    .refine((v) => {
      const n = Number(v.replace(",", "."));
      return n >= opts.min && n <= opts.max && (!opts.integer || Number.isInteger(n));
    }, `${opts.label} debe estar entre ${opts.min} y ${opts.max}${opts.integer ? " (entero)" : ""}.`);

export const parseNumber = (v: string): number => Number(v.replace(",", "."));
