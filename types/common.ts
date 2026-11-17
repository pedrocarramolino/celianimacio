/**
 * Convenciones de fechas:
 * - Instantes (momento exacto: creación, fichaje, inicio de turno) => `Date` en el dominio,
 *   `Timestamp` de Firestore en la base de datos.
 * - Fechas de calendario sin hora (fecha de incorporación, día de disponibilidad) =>
 *   cadena ISO `YYYY-MM-DD` interpretada en la zona horaria de la empresa (Europe/Madrid).
 * - Horas de reloj sin fecha (franjas de disponibilidad) => cadena `HH:mm`.
 */
export type ISODate = string; // YYYY-MM-DD
export type ClockTime = string; // HH:mm
export type EntityId = string;

export interface AuditFields {
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: EntityId | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
