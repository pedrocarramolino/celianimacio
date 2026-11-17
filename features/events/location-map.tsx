"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";

const DEFAULT_CENTER: [number, number] = [41.3874, 2.1686]; // Barcelona

/**
 * Mapa (OpenStreetMap + Leaflet, gratuito) para fijar el punto exacto del evento.
 * Clic en el mapa o arrastrar el marcador actualiza las coordenadas. El círculo muestra el radio.
 */
export function LocationMap({
  lat,
  lng,
  radiusMeters,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const circle = useRef<Circle | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const has = lat != null && lng != null;

  // Inicialización (Leaflet solo funciona en el navegador)
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      const center: [number, number] = has ? [lat!, lng!] : DEFAULT_CENTER;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView(center, has ? 17 : 8);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:22px;height:22px;border-radius:9999px;background:#0e5a5f;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      marker.current = L.marker(center, { draggable: true, icon, opacity: has ? 1 : 0 }).addTo(m);
      circle.current = L.circle(center, { radius: radiusMeters, color: "#0e5a5f", weight: 1, fillOpacity: has ? 0.12 : 0, opacity: has ? 1 : 0 }).addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        pickRef.current(p.lat, p.lng);
      });
      m.on("click", (e) => pickRef.current(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setTimeout(() => m.invalidateSize(), 50);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar con los campos del formulario
  useEffect(() => {
    if (!map.current || !marker.current || !circle.current) return;
    if (!has) return;
    const p: [number, number] = [lat!, lng!];
    marker.current.setLatLng(p).setOpacity(1);
    circle.current.setLatLng(p).setRadius(radiusMeters).setStyle({ opacity: 1, fillOpacity: 0.12 });
    const inView = map.current.getBounds().contains(p);
    if (!inView || map.current.getZoom() < 14) map.current.setView(p, Math.max(map.current.getZoom(), 17));
  }, [lat, lng, radiusMeters, has]);

  return (
    <div className="space-y-1">
      <div ref={el} className="z-0 h-72 w-full overflow-hidden rounded-lg border" role="application" aria-label="Mapa para marcar la ubicación" />
      <p className="text-xs text-muted-foreground">Haz clic en el mapa o arrastra el punto para ajustar la ubicación exacta. El círculo es el radio permitido para fichar.</p>
    </div>
  );
}
