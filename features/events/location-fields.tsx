"use client";
import { useState } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch, Path, PathValue } from "react-hook-form";
import { Crosshair, ExternalLink } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { Location } from "@/types";
import { mapsUrl } from "@/utils/geo";

export interface LocationFormShape {
  locationName: string;
  address: string;
  lat: string;
  lng: string;
  radiusMeters: string;
  locationId?: string;
}

/** Campos de ubicación reutilizables (evento y turno). */
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
  const { locate, locating } = useGeolocation();
  const [geoError, setGeoError] = useState<string | null>(null);
  const set = <K extends keyof LocationFormShape>(key: K, value: string) =>
    setValue(key as unknown as Path<T>, value as PathValue<T, Path<T>>, { shouldValidate: true, shouldDirty: true });
  const lat = watch("lat" as Path<T>) as string;
  const lng = watch("lng" as Path<T>) as string;
  const err = (k: keyof LocationFormShape) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const latN = Number(String(lat).replace(",", "."));
  const lngN = Number(String(lng).replace(",", "."));
  const hasCoords = lat !== "" && lng !== "" && Number.isFinite(latN) && Number.isFinite(lngN);

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
                set("lat", String(loc.lat));
                set("lng", String(loc.lng));
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
        <FormField id="lat" label="Latitud" error={err("lat")} hint="Ej.: 41.3874" required>
          <Input inputMode="decimal" {...register("lat" as Path<T>)} />
        </FormField>
        <FormField id="lng" label="Longitud" error={err("lng")} hint="Ej.: 2.1686" required>
          <Input inputMode="decimal" {...register("lng" as Path<T>)} />
        </FormField>
        <FormField id="radiusMeters" label="Radio permitido para fichar (m)" error={err("radiusMeters")} required>
          <Input inputMode="numeric" {...register("radiusMeters" as Path<T>)} />
        </FormField>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            variant="outline"
            loading={locating}
            onClick={async () => {
              setGeoError(null);
              const r = await locate();
              if (r.reading) {
                set("lat", r.reading.coords.lat.toFixed(6));
                set("lng", r.reading.coords.lng.toFixed(6));
              } else setGeoError(r.error);
            }}
          >
            <Crosshair /> Usar mi ubicación
          </Button>
          {hasCoords && (
            <Button type="button" variant="ghost" asChild>
              <a href={mapsUrl({ lat: latN, lng: lngN })} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Ver en el mapa
              </a>
            </Button>
          )}
        </div>
      </div>
      {geoError && <p className="text-xs text-destructive">{geoError}</p>}
      <p className="text-xs text-muted-foreground">
        Consejo: en Google Maps, pulsa con el botón derecho sobre el punto exacto para copiar sus coordenadas.
      </p>
    </div>
  );
}
