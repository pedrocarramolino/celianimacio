/**
 * Utilidades de fecha independientes de la zona horaria del navegador.
 * Todas las conversiones usan la zona de la empresa (por defecto Europe/Madrid).
 * Funciones puras: se pueden probar sin navegador.
 */
const DEFAULT_TZ = "Europe/Madrid";
const LOCALE = "es-ES";

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function zonedParts(date: Date, tz: string = DEFAULT_TZ): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year ?? 0,
    month: out.month ?? 0,
    day: out.day ?? 0,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

function offsetMs(utcMs: number, tz: string): number {
  const p = zonedParts(new Date(utcMs), tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isISODate(v: string): boolean {
  if (!ISO_DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isClockTime(v: string): boolean {
  return CLOCK_RE.test(v);
}

/** Convierte una fecha y hora "de pared" en la zona indicada a un instante absoluto. */
export function zonedDateTimeToDate(isoDate: string, clock: string, tz: string = DEFAULT_TZ): Date {
  if (!isISODate(isoDate) || !isClockTime(clock)) {
    throw new Error(`Fecha u hora no válida: ${isoDate} ${clock}`);
  }
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const [hh, mm] = clock.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMs(guess, tz);
  let t = guess - off1;
  const off2 = offsetMs(t, tz);
  if (off1 !== off2) t = guess - off2;
  return new Date(t);
}

/** Día de calendario (YYYY-MM-DD) de un instante en la zona indicada. */
export function toISODate(date: Date, tz: string = DEFAULT_TZ): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Hora de reloj (HH:mm) de un instante en la zona indicada. */
export function toClockTime(date: Date, tz: string = DEFAULT_TZ): string {
  const p = zonedParts(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function todayISO(tz: string = DEFAULT_TZ): string {
  return toISODate(new Date(), tz);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Suma días a una fecha de calendario (sin depender de zonas horarias). */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = lunes ... 6 = domingo */
export function weekdayIndexISO(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 domingo
  return (js + 6) % 7;
}

/** Lunes de la semana que contiene la fecha. */
export function weekStartISO(isoDate: string): string {
  return addDaysISO(isoDate, -weekdayIndexISO(isoDate));
}

export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

/** Inicio (incluido) y fin (excluido) de un día de calendario como instantes. */
export function dayRange(isoDate: string, tz: string = DEFAULT_TZ): { start: Date; end: Date } {
  return {
    start: zonedDateTimeToDate(isoDate, "00:00", tz),
    end: zonedDateTimeToDate(addDaysISO(isoDate, 1), "00:00", tz),
  };
}

export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/**
 * Construye el intervalo de un turno. Si la hora de fin es menor o igual que la de inicio,
 * se entiende que el turno termina al día siguiente.
 */
export function buildShiftInterval(
  isoDate: string,
  startClock: string,
  endClock: string,
  tz: string = DEFAULT_TZ,
): { startAt: Date; endAt: Date } {
  const startAt = zonedDateTimeToDate(isoDate, startClock, tz);
  const endDate = clockToMinutes(endClock) <= clockToMinutes(startClock) ? addDaysISO(isoDate, 1) : isoDate;
  const endAt = zonedDateTimeToDate(endDate, endClock, tz);
  return { startAt, endAt };
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

// ---- Formato para la interfaz -------------------------------------------------

export function formatDate(date: Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateLong(date: Date, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatISODate(isoDate: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!isoDate || !isISODate(isoDate)) return "—";
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function formatWeekday(isoDate: string, style: "short" | "long" = "short"): string {
  return formatISODate(isoDate, { weekday: style, day: undefined, month: undefined, year: undefined });
}

export function formatTime(date: Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!date) return "—";
  return toClockTime(date, tz);
}

export function formatDateTime(date: Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatMinutes(total: number | null | undefined): string {
  if (total == null) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

// ---- Meses ---------------------------------------------------------------------

/** Primer día del mes (YYYY-MM-01). */
export function monthStartISO(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Suma meses a una fecha de calendario y devuelve el primer día de ese mes. */
export function addMonthsISO(isoDate: string, months: number): string {
  const [y, m] = isoDate.split("-").map(Number) as [number, number];
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-01`;
}

/** Último día del mes. */
export function monthEndISO(isoDate: string): string {
  return addDaysISO(addMonthsISO(isoDate, 1), -1);
}

/** Días de la cuadrícula mensual (semanas completas de lunes a domingo). */
export function monthGridISO(isoDate: string): string[] {
  const first = weekStartISO(monthStartISO(isoDate));
  const last = addDaysISO(weekStartISO(monthEndISO(isoDate)), 6);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDaysISO(d, 1)) days.push(d);
  return days;
}

export function formatMonth(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number) as [number, number];
  const text = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
