"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch, Path, PathValue } from "react-hook-form";
import { ClipboardPaste, Crosshair, ExternalLink, Search } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useGeolocation } from "@/hooks/use-geolocation";
import { searchAddress, type GeocodeResult } from "@/services/geocoding.service";
import type { Location } from "@/types";
import { mapsUrl, parseCoordinates } from "@/utils/geo";
import { errorMessage } from "@/utils/errors";

const LocationMap = dynamic(() => import("./location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-muted" />,
});

export interface LocationFormShape {
  locationName: string;
  address: string;
  lat: string;
  lng: string;
  radiusMeters: string;
  locationId?: string;
}

const round6 = (n: number) => n.toFixed(6);

/** Campos de ubicación reutilizables (evento, turno y ubicaciones guardadas). */
export function LocationFields<T extends LocationFormShape>({
  register,
  errors,
  setValue,
  watch,
  locations,
  withPicker,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  locations?: Location[];
  withPicker?: boolean;
}) {
  const { locateBest, locating } = useGeolocation();
  const [geoMsg, setGeoMsg] = useState<{ kind: "success" | "warning" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [paste, setPaste] = useState("");

  const set = <K extends keyof LocationFormShape>(key: K, value: string) =>
    setValue(key as unknown as Path<T>, value as PathValue<T, Path<T>>, { shouldValidate: true, shouldDirty: true });
  const setPoint = (lat: number, lng: number) => {
    set("lat", round6(lat));
    set("lng", round6(lng));
  };

  const lat = watch("lat" as Path<T>) as string;
  const lng = watch("lng" as Path<T>) as string;
  const radius = watch("radiusMeters" as Path<T>) as string;
  const address = watch("address" as Path<T>) as string;
  const err = (k: keyof LocationFormShape) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const latN = Number(String(lat ?? "").replace(",", "."));
  const lngN = Number(String(lng ?? "").replace(",", "."));
  const hasCoords = lat !== "" && lng !== "" && lat != null && lng != null && Number.isFinite(latN) && Number.isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;
  const radiusN = Number(radius);

  async function useMyLocation() {
    setGeoMsg(null);
    const r = await locateBest();
    if (!r.reading) {
      setGeoMsg({ kind: "error", text: r.error ?? "No se pudo obtener la ubicación." });
      return;
    }
    setPoint(r.reading.coords.lat, r.reading.coords.lng);
    const acc = Math.round(r.reading.accuracyMeters);
    if (acc > 100) {
      setGeoMsg({
        kind: "warning",
        text: `Ubicación aproximada (±${acc} m). En ordenador el navegador estima la posición por la red y puede equivocarse. Comprueba el punto en el mapa y ajústalo, o busca la dirección.`,
      });
    } else {
      setGeoMsg({ kind: "success", text: `Ubicación obtenida con precisión de ±${acc} m. Revísala en el mapa.` });
    }
  }

  async function search() {
    setGeoMsg(null);
    setResults(null);
    setSearching(true);
    try {
      const r = await searchAddress(query || address);
      setResults(r);
      if (r.length === 0) setGeoMsg({ kind: "warning", text: "No se encontró la dirección. Prueba con calle, número y población, o marca el punto en el mapa." });
    } catch (e) {
      setGeoMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setSearching(false);
    }
  }

  function applyPaste(text: string) {
    setPaste(text);
    const p = parseCoordinates(text);
    if (p) {
      setPoint(p.lat, p.lng);
      setGeoMsg({ kind: "success", text: "Coordenadas aplicadas." });
      setPaste("");
    }
  }

  return (
    <div className="space-y-4">
      {withPicker && locations && locations.length > 0 && (
        <FormField id="locationId" label="Ubicación guardada" hint="Rellena los campos con una ubicación reutilizable.">
          <Select
            {...register("locationId" as Path<T>)}
            onChange={(e) => {
              const loc = locations.find((l) => l.id === e.target.value);
              set("locationId", e.target.value);
              if (loc) {
                set("locationName", loc.name);
                set("address", loc.address);
                setPoint(loc.lat, loc.lng);
                set("radiusMeters", String(loc.radiusMeters));
              }
            }}
          >
            <option value="">— Ubicación personalizada —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="locationName" label="Nombre del lugar" error={err("locationName")} required>
          <Input {...register("locationName" as Path<T>)} />
        </FormField>
        <FormField id="address" label="Dirección" error={err("address")}>
          <Input {...register("address" as Path<T>)} />
        </FormField>
      </div>

      {/* Buscar y fijar el punto */}
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">Punto exacto para fichar</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Buscar dirección"
            placeholder={address ? `Buscar: ${address}` : "Buscar dirección (calle, número, población)"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={search} loading={searching} disabled={!query.trim() && !address?.trim()}>
              <Search /> Buscar
            </Button>
            <Button type="button" variant="outline" onClick={useMyLocation} loading={locating} title="Usa el GPS del dispositivo">
              <Crosshair /> Mi ubicación
            </Button>
          </div>
        </div>
        {results && results.length > 0 && (
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full cursor-pointer px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setPoint(r.lat, r.lng);
                    if (!address) set("address", r.label.split(",").slice(0, 3).join(",").trim());
                    setResults(null);
                    setGeoMsg({ kind: "success", text: "Dirección encontrada. Ajusta el punto en el mapa si hace falta (p. ej. la entrada del recinto)." });
                  }}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {geoMsg && <Alert variant={geoMsg.kind}>{geoMsg.text}</Alert>}
        <LocationMap lat={hasCoords ? latN : null} lng={hasCoords ? lngN : null} radiusMeters={Number.isFinite(radiusN) && radiusN >= 10 ? radiusN : 200} onPick={setPoint} />
        <div className="relative">
          <ClipboardPaste className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pegar coordenadas o enlace de Google Maps"
            placeholder="O pega aquí coordenadas o un enlace de Google Maps"
            className="pl-9"
            value={paste}
            onChange={(e) => applyPaste(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="lat" label="Latitud" error={err("lat")} required>
          <Input inputMode="decimal" {...register("lat" as Path<T>)} />
        </FormField>
        <FormField id="lng" label="Longitud" error={err("lng")} required>
          <Input inputMode="decimal" {...register("lng" as Path<T>)} />
        </FormField>
        <FormField id="radiusMeters" label="Radio permitido para fichar (m)" error={err("radiusMeters")} required>
          <Input inputMode="numeric" {...register("radiusMeters" as Path<T>)} />
        </FormField>
      </div>
      {hasCoords && (
        <Button type="button" variant="link" size="sm" asChild>
          <a href={mapsUrl({ lat: latN, lng: lngN })} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Abrir en Google Maps
          </a>
        </Button>
      )}
    </div>
  );
}
