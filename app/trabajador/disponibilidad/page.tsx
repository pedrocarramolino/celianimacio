"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/layout/week-navigator";
import { ErrorState, LoadingBlock } from "@/components/layout/states";
import { WeekEditor } from "@/features/availability/week-editor";
import { useAsync } from "@/hooks/use-async";
import { availabilityService } from "@/services";
import { todayISO, weekStartISO } from "@/utils/dates";

export default function WorkerAvailabilityPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()));
  const current = useAsync(() => availabilityService.getMine(weekStart), [weekStart]);
  return (
    <>
      <PageHeader
        title="Mi disponibilidad"
        description="Indica qué días y franjas puedes trabajar. Puedes modificarla cuando lo necesites."
        actions={<WeekNavigator weekStart={weekStart} onChange={setWeekStart} />}
      />
      {current.error && <ErrorState message={current.error} onRetry={current.reload} />}
      {current.loading && current.data === undefined && <LoadingBlock rows={7} />}
      {current.data !== undefined && !current.error && (
        <WeekEditor
          key={weekStart}
          weekStart={weekStart}
          loading={current.loading}
          initial={current.data && current.data.weekStart === weekStart ? current.data : null}
          onSave={async (days, note) => {
            await availabilityService.saveMine(weekStart, days, note);
            await current.reload();
          }}
        />
      )}
    </>
  );
}
