import { z } from "zod";
import { isoDateField, optionalText, requiredText } from "./common";
import { locationFields } from "./location";
import { EVENT_CATEGORIES } from "../types/event";
import { isClockTime } from "../utils/dates";

const optionalClock = z.string().refine((v) => v === "" || isClockTime(v), "Hora no válida (HH:mm).");
const optionalInt = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= max), `${label}: número entero entre 0 y ${max}.`);
const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+([.,]\d{1,2})?$/.test(v) && Number(v.replace(",", ".")) <= 1_000_000), "Importe no válido (ej.: 1087 o 1087,50).");

export const eventSchema = z
  .object({
    name: requiredText(160, "El nombre"),
    description: optionalText(4000),
    date: isoDateField,
    status: z.enum(["draft", "scheduled", "in_progress", "completed"]),
    category: z.enum(EVENT_CATEGORIES, { message: "Elige el tipo de evento." }),
    instructions: optionalText(4000),
    locationId: z.string(),
    ...locationFields,
    // Ficha del evento
    meetingTime: optionalClock,
    meetingPlace: optionalText(120),
    startTime: optionalClock,
    endTime: optionalClock,
    room: optionalText(120),
    kids: optionalInt("Niños", 2000),
    ages: optionalText(80),
    dressCode: optionalText(200),
    material: optionalText(2000),
    contactPhone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || /^[+0-9 ()-]{6,30}$/.test(v), "Teléfono no válido."),
    // Pago (visible para el equipo)
    totalPrice: optionalMoney,
    paidAmount: optionalMoney,
    extraHour: optionalText(120),
    // Solo administración
    adminNotes: optionalText(2000),
    // Solo al crear
    createShift: z.boolean(),
    monitors: optionalInt("Monitores", 200),
  })
  .superRefine((v, ctx) => {
    const money = (x: string) => Number(x.replace(",", "."));
    if (v.paidAmount !== "" && v.totalPrice !== "" && money(v.paidAmount) > money(v.totalPrice)) {
      ctx.addIssue({ code: "custom", path: ["paidAmount"], message: "Lo pagado no puede superar el precio total." });
    }
    if ((v.startTime === "") !== (v.endTime === "")) {
      ctx.addIssue({ code: "custom", path: [v.startTime ? "endTime" : "startTime"], message: "Indica inicio y fin del evento." });
    }
    if (v.createShift && (!v.startTime || !v.endTime)) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Para crear el turno automático indica el horario del evento." });
    }
    if (v.createShift && (v.monitors === "" || Number(v.monitors) < 1)) {
      ctx.addIssue({ code: "custom", path: ["monitors"], message: "Indica cuántos monitores hacen falta." });
    }
  });
export type EventFormValues = z.infer<typeof eventSchema>;
