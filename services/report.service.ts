import type { AttendanceRepository } from "@/repositories/contracts";
import type { AttendanceSession } from "@/types";
import { INCIDENT_LABELS, ATTENDANCE_STATUS_LABELS } from "@/types";
import { dayRange, addDaysISO, formatDateTime, toISODate } from "@/utils/dates";
import { toCsv, type CsvCell } from "@/utils/csv";
import { hoursByDay, hoursByEmployee, hoursByEvent, totals, type HoursRow } from "./domain/reports";
import { requireAdmin } from "./session";

export interface ReportData {
  from: string;
  to: string;
  sessions: AttendanceSession[];
  byEmployee: HoursRow[];
  byEvent: HoursRow[];
  byDay: HoursRow[];
  incomplete: AttendanceSession[];
  withIncidents: AttendanceSession[];
  totals: ReturnType<typeof totals>;
}

const hours = (min: number) => (min / 60).toFixed(2).replace(".", ",");

export class ReportService {
  constructor(private readonly attendance: AttendanceRepository) {}

  async build(from: string, toInclusive: string): Promise<ReportData> {
    requireAdmin();
    const start = dayRange(from).start;
    const end = dayRange(addDaysISO(toInclusive, 0)).end;
    const sessions = await this.attendance.listSessionsInRange(start, end);
    const byEmployee = hoursByEmployee(sessions);
    return {
      from,
      to: toInclusive,
      sessions,
      byEmployee,
      byEvent: hoursByEvent(sessions),
      byDay: hoursByDay(sessions, (d) => toISODate(d)),
      incomplete: sessions.filter((s) => s.status !== "closed"),
      withIncidents: sessions.filter((s) => s.hasIncident),
      totals: totals(byEmployee),
    };
  }

  summaryCsv(rows: HoursRow[], label: string): string {
    return toCsv(
      [label, "Jornadas", "Horas trabajadas", "Horas de pausa", "Incompletas", "Incidencias"],
      rows.map((r) => [r.label, r.sessions, hours(r.workedMinutes), hours(r.breakMinutes), r.incomplete, r.incidents]),
    );
  }

  detailCsv(sessions: AttendanceSession[]): string {
    const rows: CsvCell[][] = sessions.map((s) => [
      s.employeeName,
      s.eventName,
      s.shiftName,
      formatDateTime(s.shiftStartAt),
      formatDateTime(s.checkIn.serverAt ?? s.checkIn.clientAt),
      formatDateTime(s.checkOut?.serverAt ?? s.checkOut?.clientAt ?? null),
      s.totalBreakMinutes,
      s.workedMinutes == null ? "" : hours(s.workedMinutes),
      ATTENDANCE_STATUS_LABELS[s.status],
      s.checkIn.distanceMeters ?? "",
      s.checkIn.withinRadius == null ? "" : s.checkIn.withinRadius ? "Sí" : "No",
      s.incidents.map((i) => INCIDENT_LABELS[i.type]).join(" | "),
      s.adminNote,
    ]);
    return toCsv(
      [
        "Trabajador",
        "Evento",
        "Turno",
        "Inicio turno",
        "Entrada (servidor)",
        "Salida (servidor)",
        "Pausas (min)",
        "Horas netas",
        "Estado",
        "Distancia entrada (m)",
        "Dentro del radio",
        "Incidencias",
        "Nota administración",
      ],
      rows,
    );
  }
}
