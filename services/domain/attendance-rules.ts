/**
 * Reglas puras de fichaje. En la v1 se ejecutan en el navegador (NO es antifraude):
 * la misma lógica puede ejecutarse en un backend cuando exista (ver AttendanceValidator).
 */
import type { AttendanceIncident, AttendanceStatus, GeoPoint, LocationSnapshot } from "../../types";
import { distanceMeters } from "../../utils/geo";

export type AttendanceAction = "check_in" | "break_start" | "break_end" | "check_out";

export const ACTION_LABELS: Record<AttendanceAction, string> = {
  check_in: "Entrada",
  break_start: "Inicio de pausa",
  break_end: "Fin de pausa",
  check_out: "Salida",
};

/** Máquina de estados: qué acciones son válidas según el estado actual de la jornada. */
export function allowedActions(status: AttendanceStatus | null): AttendanceAction[] {
  switch (status) {
    case null:
      return ["check_in"];
    case "open":
      return ["break_start", "check_out"];
    case "on_break":
      return ["break_end"];
    case "closed":
      return [];
  }
}

export function isActionAllowed(status: AttendanceStatus | null, action: AttendanceAction): boolean {
  return allowedActions(status).includes(action);
}

export interface PositionReading {
  coords: GeoPoint;
  accuracyMeters: number;
}

export interface LocationEvaluation {
  coords: GeoPoint | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  withinRadius: boolean | null;
  incidents: AttendanceIncident[];
}

/**
 * Evalúa una lectura GPS frente al punto del evento.
 * Se considera "dentro" si la distancia es menor o igual al radio. La precisión se registra
 * y, si es peor que el máximo configurado, se añade una incidencia.
 */
export function evaluateLocation(params: {
  reading: PositionReading | null;
  readingError: string | null;
  target: LocationSnapshot;
  maxAccuracyMeters: number;
  stage: AttendanceAction;
  now: Date;
}): LocationEvaluation {
  const { reading, target, stage, now } = params;
  if (!reading) {
    return {
      coords: null,
      accuracyMeters: null,
      distanceMeters: null,
      withinRadius: null,
      incidents: [
        {
          type: "location_unavailable",
          stage,
          message: params.readingError ?? "No se pudo obtener la ubicación del dispositivo.",
          at: now,
        },
      ],
    };
  }
  const distance = distanceMeters(reading.coords, { lat: target.lat, lng: target.lng });
  const within = distance <= target.radiusMeters;
  const incidents: AttendanceIncident[] = [];
  if (!within) {
    incidents.push({
      type: "outside_radius",
      stage,
      message: `A ${Math.round(distance)} m del punto autorizado (radio ${target.radiusMeters} m).`,
      at: now,
    });
  }
  if (reading.accuracyMeters > params.maxAccuracyMeters) {
    incidents.push({
      type: "low_accuracy",
      stage,
      message: `Precisión de ${Math.round(reading.accuracyMeters)} m (máximo ${params.maxAccuracyMeters} m).`,
      at: now,
    });
  }
  return {
    coords: reading.coords,
    accuracyMeters: Math.round(reading.accuracyMeters),
    distanceMeters: Math.round(distance),
    withinRadius: within,
    incidents,
  };
}

export const LATE_TOLERANCE_MINUTES = 10;

/** Ventana en la que se permite la entrada (debe coincidir con firestore.rules: máx. 120 min antes). */
export function checkInWindow(shiftStartAt: Date, shiftEndAt: Date, earlyMinutes: number): { opensAt: Date; closesAt: Date } {
  const early = Math.min(Math.max(earlyMinutes, 0), 120);
  return { opensAt: new Date(shiftStartAt.getTime() - early * 60000), closesAt: shiftEndAt };
}

export function lateIncident(shiftStartAt: Date, now: Date): AttendanceIncident | null {
  const lateMinutes = Math.floor((now.getTime() - shiftStartAt.getTime()) / 60000);
  if (lateMinutes <= LATE_TOLERANCE_MINUTES) return null;
  return { type: "late_check_in", stage: "check_in", message: `Entrada ${lateMinutes} min después del inicio.`, at: now };
}

export function computeWorkedMinutes(checkInAt: Date, checkOutAt: Date, breakMinutes: number): number {
  const gross = Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000));
  return Math.max(0, gross - breakMinutes);
}
