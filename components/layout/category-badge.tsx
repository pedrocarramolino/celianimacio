import { cn } from "@/lib/utils";
import { EVENT_CATEGORY_EMOJI, EVENT_CATEGORY_LABELS, type EventCategory } from "@/types";

const tone: Partial<Record<EventCategory, string>> = {
  boda: "bg-[#fde6e1] text-[#a8321f]",
  comunion: "bg-[#e5f0fb] text-[#17589e]",
  bautizo: "bg-[#e5f0fb] text-[#17589e]",
  cumpleanos: "bg-[#fff1d9] text-[#8a4b00]",
  fiesta_infantil: "bg-[#fff1d9] text-[#8a4b00]",
  papa_noel: "bg-[#fde6e1] text-[#a8321f]",
  halloween: "bg-[#ffe9d1] text-[#9a4a00]",
  fallas: "bg-[#ffe9d1] text-[#9a4a00]",
  fiesta_espuma: "bg-[#e3f2fd] text-[#1565a8]",
  campus: "bg-[#e3f4e9] text-[#2c6e45]",
  torneo: "bg-[#e3f4e9] text-[#2c6e45]",
};

export function CategoryBadge({ category, className }: { category: EventCategory; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tone[category] ?? "bg-muted text-muted-foreground", className)}>
      <span aria-hidden>{EVENT_CATEGORY_EMOJI[category]}</span>
      {EVENT_CATEGORY_LABELS[category]}
    </span>
  );
}
