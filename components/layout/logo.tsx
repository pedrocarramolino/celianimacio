import { cn } from "@/lib/utils";

/** Colores de la marca Cel i Animació (logotipo). */
export const BRAND_COLORS = {
  blue: "#1d6fd8",
  red: "#e53935",
  orange: "#f57c00",
  yellow: "#fbc02d",
} as const;

/** Símbolo: sol de la marca sobre círculo blanco. */
export function LogoMark({ className }: { className?: string }) {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i * 36 * Math.PI) / 180;
    const x1 = 24 + Math.cos(a) * 11;
    const y1 = 24 + Math.sin(a) * 11;
    const x2 = 24 + Math.cos(a) * 17;
    const y2 = 24 + Math.sin(a) * 17;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 2 ? BRAND_COLORS.orange : BRAND_COLORS.yellow} strokeWidth="3.2" strokeLinecap="round" />;
  });
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#fff" stroke="#dbe7f5" strokeWidth="1.5" />
      {rays}
      <circle cx="24" cy="24" r="7.5" fill={BRAND_COLORS.yellow} />
      <path d="M20.5 25.5 q3.5 3 7 0" stroke={BRAND_COLORS.orange} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="21.5" cy="22.5" r="1" fill={BRAND_COLORS.orange} />
      <circle cx="26.5" cy="22.5" r="1" fill={BRAND_COLORS.orange} />
    </svg>
  );
}

/** Logotipo tipográfico con los colores de la marca. */
export function Wordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("font-extrabold tracking-tight", className)}>
      <span style={{ color: light ? "#fff" : BRAND_COLORS.blue }}>Cel</span>{" "}
      <span style={{ color: light ? "#ffd27a" : BRAND_COLORS.red }}>i</span>{" "}
      <span style={{ color: light ? "#ffb74d" : BRAND_COLORS.orange }}>Animació</span>
    </span>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <p>
          <Wordmark />
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{subtitle ?? "Momentos divertidos"}</p>
      </div>
    </div>
  );
}
