"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Pestañas en una sola línea; en móvil se desplazan horizontalmente y la activa queda visible. */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    const left = active.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + active.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
    }
  }, [value]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-nowrap overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
