import type { GeoPoint } from "@/types";
import { AppError } from "@/utils/errors";

export interface GeocodeResult extends GeoPoint {
  label: string;
}

/**
 * Búsqueda de direcciones con Nominatim (OpenStreetMap), gratuito y sin clave.
 * Política de uso: máx. 1 petición/s, solo bajo demanda del usuario (botón "Buscar").
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) throw new AppError("Escribe una dirección más completa.");
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=es&accept-language=es&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new AppError("El buscador de direcciones no está disponible ahora. Marca el punto en el mapa.");
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), label: d.display_name }));
}
