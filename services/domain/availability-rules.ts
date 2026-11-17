import type { DayAvailability, Shift, WeeklyAvailability } from "../../types";
import { addDaysISO, clockToMinutes, toClockTime, toISODate } from "../../utils/dates";

export function emptyWeek(weekStart: string): DayAvailability[] {
  return Array.from({ length: 7 }, (_, i) => ({ date: addDaysISO(weekStart, i), status: "unset" as const, slots: [] }));
}

export type AvailabilityMatch = "available" | "partial_match" | "outside_slots" | "unavailable" | "unknown";

export const AVAILABILITY_MATCH_LABELS: Record<AvailabilityMatch, string> = {
  available: "Disponible",
  partial_match: "Disponible en franja",
  outside_slots: "Fuera de su franja",
  unavailable: "No disponible",
  unknown: "Sin indicar",
};

/**
 * ¿Encaja un turno en la disponibilidad declarada? Solo se compara el día de inicio del turno.
 * Turnos que cruzan medianoche se comparan hasta las 23:59.
 */
export function matchShiftAvailability(
  shift: Pick<Shift, "startAt" | "endAt">,
  week: WeeklyAvailability | null,
  tz?: string,
): AvailabilityMatch {
  if (!week) return "unknown";
  const date = toISODate(shift.startAt, tz);
  const day = week.days.find((d) => d.date === date);
  if (!day || day.status === "unset") return "unknown";
  if (day.status === "unavailable") return "unavailable";
  if (day.status === "available") return "available";
  const start = clockToMinutes(toClockTime(shift.startAt, tz));
  const sameDay = toISODate(shift.endAt, tz) === date;
  const end = sameDay ? clockToMinutes(toClockTime(shift.endAt, tz)) : 24 * 60 - 1;
  const fits = day.slots.some((s) => clockToMinutes(s.start) <= start && clockToMinutes(s.end) >= end);
  return fits ? "partial_match" : "outside_slots";
}

export function validateSlots(day: DayAvailability): string | null {
  if (day.status !== "partial") return null;
  if (day.slots.length === 0) return "Añade al menos una franja horaria.";
  const sorted = [...day.slots].sort((a, b) => clockToMinutes(a.start) - clockToMinutes(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    if (clockToMinutes(s.end) <= clockToMinutes(s.start)) return `La franja ${s.start}–${s.end} no es válida.`;
    const next = sorted[i + 1];
    if (next && clockToMinutes(next.start) < clockToMinutes(s.end)) return "Hay franjas que se solapan.";
  }
  return null;
}
