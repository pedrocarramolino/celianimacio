"use client";
import { useCallback, useState } from "react";
import type { PositionReading } from "@/services/domain/attendance-rules";

export interface GeoResult {
  reading: PositionReading | null;
  error: string | null;
}

function describe(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permiso de ubicación denegado. Actívalo en los ajustes del navegador.";
    case err.POSITION_UNAVAILABLE:
      return "La ubicación no está disponible en este momento.";
    case err.TIMEOUT:
      return "Se agotó el tiempo para obtener la ubicación.";
    default:
      return "No se pudo obtener la ubicación.";
  }
}

/** Solicita la posición actual (alta precisión). Nunca lanza: devuelve lectura o error. */
export function useGeolocation() {
  const [locating, setLocating] = useState(false);

  const locate = useCallback(async (): Promise<GeoResult> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return { reading: null, error: "Este dispositivo no permite geolocalización." };
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return { reading: null, error: "La geolocalización requiere HTTPS." };
    }
    setLocating(true);
    try {
      return await new Promise<GeoResult>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              reading: {
                coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                accuracyMeters: pos.coords.accuracy,
              },
              error: null,
            }),
          (err) => resolve({ reading: null, error: describe(err) }),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
      });
    } finally {
      setLocating(false);
    }
  }, []);

  /**
   * Varias lecturas durante unos segundos y devuelve la más precisa (útil para fijar el punto
   * de un evento). Termina antes si alcanza la precisión objetivo.
   */
  const locateBest = useCallback(async (maxMs = 12000, targetAccuracy = 20): Promise<GeoResult> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return { reading: null, error: "Este dispositivo no permite geolocalización." };
    }
    setLocating(true);
    try {
      return await new Promise<GeoResult>((resolve) => {
        let best: PositionReading | null = null;
        let lastError: string | null = null;
        const finish = () => {
          navigator.geolocation.clearWatch(id);
          clearTimeout(timer);
          resolve(best ? { reading: best, error: null } : { reading: null, error: lastError ?? "No se pudo obtener la ubicación." });
        };
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            if (!best || pos.coords.accuracy < best.accuracyMeters) {
              best = { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, accuracyMeters: pos.coords.accuracy };
            }
            if (pos.coords.accuracy <= targetAccuracy) finish();
          },
          (err) => {
            lastError = describe(err);
            if (err.code === err.PERMISSION_DENIED) finish();
          },
          { enableHighAccuracy: true, timeout: maxMs, maximumAge: 0 },
        );
        const timer = setTimeout(finish, maxMs);
      });
    } finally {
      setLocating(false);
    }
  }, []);

  return { locate, locateBest, locating };
}
