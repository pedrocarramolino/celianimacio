/** Agregaciones puras para informes. */
import type { AttendanceSession } from "../../types";

export interface HoursRow {
  key: string;
  label: string;
  sessions: number;
  workedMinutes: number;
  breakMinutes: number;
  incomplete: number;
  incidents: number;
}

function aggregate(sessions: AttendanceSession[], keyOf: (s: AttendanceSession) => { key: string; label: string }): HoursRow[] {
  const map = new Map<string, HoursRow>();
  for (const s of sessions) {
    const { key, label } = keyOf(s);
    const row = map.get(key) ?? { key, label, sessions: 0, workedMinutes: 0, breakMinutes: 0, incomplete: 0, incidents: 0 };
    row.sessions += 1;
    row.workedMinutes += s.workedMinutes ?? 0;
    row.breakMinutes += s.totalBreakMinutes;
    if (s.status !== "closed") row.incomplete += 1;
    row.incidents += s.incidents.length;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.workedMinutes - a.workedMinutes);
}

export const hoursByEmployee = (s: AttendanceSession[]) =>
  aggregate(s, (x) => ({ key: x.employeeId, label: x.employeeName }));

export const hoursByEvent = (s: AttendanceSession[]) => aggregate(s, (x) => ({ key: x.eventId, label: x.eventName }));

/** Horas agrupadas por tipo de evento (la etiqueta la resuelve quien llama). */
export function hoursByCategory(
  s: AttendanceSession[],
  categoryOf: (eventId: string) => { key: string; label: string },
): HoursRow[] {
  return aggregate(s, (x) => categoryOf(x.eventId));
}

export function hoursByDay(s: AttendanceSession[], toDay: (d: Date) => string): HoursRow[] {
  return aggregate(s, (x) => {
    const d = toDay(x.shiftStartAt);
    return { key: d, label: d };
  }).sort((a, b) => a.key.localeCompare(b.key));
}

export function totals(rows: HoursRow[]) {
  return rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + r.sessions,
      workedMinutes: acc.workedMinutes + r.workedMinutes,
      breakMinutes: acc.breakMinutes + r.breakMinutes,
      incomplete: acc.incomplete + r.incomplete,
      incidents: acc.incidents + r.incidents,
    }),
    { sessions: 0, workedMinutes: 0, breakMinutes: 0, incomplete: 0, incidents: 0 },
  );
}
