import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <rect width="48" height="48" rx="12" fill="var(--primary)" />
      <path d="M14 30c3.5 4 10 5.2 14.6 2.6M14.4 18.6A11 11 0 0 1 33 16" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="33.5" cy="27.5" r="3.4" fill="#9fd3cf" />
      <circle cx="17" cy="24" r="2" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className="font-semibold tracking-tight">Cel i Animació</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
