import type { EntityId, GeoPoint } from "./common";

export const ATTENDANCE_STATUSES = ["open", "on_break", "closed"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  open: "Trabajando",
  on_break: "En pausa",
  closed: "Finalizado",
};

export const INCIDENT_TYPES = [
  "outside_radius",
  "location_unavailable",
  "low_accuracy",
  "late_check_in",
  "missing_check_out",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  outside_radius: "Fuera del radio autorizado",
  location_unavailable: "Ubicación no disponible",
  low_accuracy: "Precisión GPS insuficiente",
  late_check_in: "Entrada con retraso",
  missing_check_out: "Salida no registrada",
};

/**
 * Origen de la validación de ubicación. En Spark siempre es "client":
 * el navegador calcula la distancia y NO es una prueba de autenticidad.
 */
export type ValidationSource = "client" | "server";

export interface AttendancePunch {
  /** Hora del dispositivo en el momento del fichaje. */
  clientAt: Date;
  /** Hora del servidor de Firestore (serverTimestamp, verificada por reglas con request.time). */
  serverAt: Date | null;
  coords: GeoPoint | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  withinRadius: boolean | null;
  validation: ValidationSource;
}

export interface AttendanceIncident {
  type: IncidentType;
  stage: "check_in" | "break_start" | "break_end" | "check_out";
  message: string;
  at: Date;
}

/** attendanceSessions/{shiftId}_{employeeId} — un registro de jornada por turno y empleado. */
export interface AttendanceSession {
  id: EntityId;
  shiftId: EntityId;
  eventId: EntityId;
  employeeId: EntityId;
  userId: EntityId;
  employeeName: string;
  eventName: string;
  shiftName: string;
  shiftStartAt: Date;
  shiftEndAt: Date;
  status: AttendanceStatus;
  checkIn: AttendancePunch;
  checkOut: AttendancePunch | null;
  breakCount: number;
  totalBreakMinutes: number;
  /** Minutos trabajados netos (sin pausas). Se calcula al cerrar. */
  workedMinutes: number | null;
  incidents: AttendanceIncident[];
  hasIncident: boolean;
  /** Nota del administrador al revisar o cerrar la jornada. */
  adminNote: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** breakRecords/{sessionId}_{index} */
export interface BreakRecord {
  id: EntityId;
  sessionId: EntityId;
  employeeId: EntityId;
  userId: EntityId;
  index: number;
  start: AttendancePunch;
  end: AttendancePunch | null;
  durationMinutes: number | null;
}
