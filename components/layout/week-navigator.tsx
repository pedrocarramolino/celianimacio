"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDaysISO, formatISODate, todayISO, weekStartISO } from "@/utils/dates";

export function WeekNavigator({ weekStart, onChange }: { weekStart: string; onChange: (w: string) => void }) {
  const end = addDaysISO(weekStart, 6);
  const current = weekStartISO(todayISO());
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => onChange(addDaysISO(weekStart, -7))}>
        <ChevronLeft />
      </Button>
      <div className="min-w-44 px-2 text-center text-sm font-medium" aria-live="polite">
        {formatISODate(weekStart, { year: undefined })} – {formatISODate(end)}
      </div>
      <Button variant="outline" size="icon" aria-label="Semana siguiente" onClick={() => onChange(addDaysISO(weekStart, 7))}>
        <ChevronRight />
      </Button>
      {weekStart !== current && (
        <Button variant="ghost" size="sm" onClick={() => onChange(current)}>
          Hoy
        </Button>
      )}
    </div>
  );
}
