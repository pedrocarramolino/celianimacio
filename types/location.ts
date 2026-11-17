import type { AuditFields, EntityId } from "./common";

/** locations/{locationId} — ubicaciones reutilizables (salones, fincas, espacios). */
export interface Location extends AuditFields {
  id: EntityId;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Radio permitido para fichar, en metros. */
  radiusMeters: number;
  notes: string;
}

/**
 * Copia de la ubicación guardada dentro del evento/turno. Se guarda como instantánea para que
 * los fichajes históricos no cambien si se edita la ubicación reutilizable.
 */
export interface LocationSnapshot {
  locationId: EntityId | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}
