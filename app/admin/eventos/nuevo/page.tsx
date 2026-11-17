"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingBlock } from "@/components/layout/states";
import { EventForm, emptyEvent } from "@/features/events/event-form";
import { useAsync } from "@/hooks/use-async";
import { eventService, settingsService } from "@/services";
import { todayISO } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const data = useAsync(async () => {
    const [locations, settings] = await Promise.all([eventService.listLocations(), settingsService.get()]);
    return { locations, settings };
  }, []);
  return (
    <>
      <PageHeader title="Nuevo evento" description="Después de crearlo podrás añadir uno o varios turnos." />
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {!data.data && !data.error && <LoadingBlock rows={4} />}
      {data.data && (
        <EventForm
          defaultValues={emptyEvent(data.data.settings.defaultRadiusMeters, todayISO())}
          locations={data.data.locations}
          submitLabel="Crear evento"
          error={error}
          onSubmit={async (v) => {
            setError(null);
            try {
              const id = await eventService.create(v);
              router.push(`/admin/eventos/detalle/?id=${id}`);
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        />
      )}
    </>
  );
}
