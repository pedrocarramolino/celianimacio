import type { GeoPoint } from "../types/common";

const EARTH_RADIUS_M = 6_371_000;

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidCoordinate(p: GeoPoint): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

export function mapsUrl(p: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

/**
 * Extrae coordenadas de un texto: "41.3874, 2.1686", "41,3874 2,1686" o enlaces de Google Maps
 * (".../@41.3874,2.1686,17z", "?q=41.3874,2.1686", "!3d41.3874!4d2.1686").
 */
export function parseCoordinates(text: string): GeoPoint | null {
  const t = text.trim();
  if (!t) return null;
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
    /^(-?\d+(?:,\d+)?)\s+(-?\d+(?:,\d+)?)$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1] && m[2]) {
      const p = { lat: Number(m[1].replace(",", ".")), lng: Number(m[2].replace(",", ".")) };
      if (isValidCoordinate(p)) return p;
    }
  }
  return null;
}
