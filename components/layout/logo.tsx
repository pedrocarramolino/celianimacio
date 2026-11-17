/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Colores de la marca Cel i Animació (logotipo). */
export const BRAND_COLORS = {
  blue: "#3b8fd8",
  red: "#e2533b",
  orange: "#f39a1f",
  yellow: "#f6c12d",
  navy: "#1f4f8a",
} as const;

/** Insignia circular oficial (logo sobre círculo blanco). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-circulo-256.webp"
      alt=""
      aria-hidden
      width={256}
      height={256}
      className={cn("size-10 shrink-0 rounded-full bg-white shadow-sm ring-1 ring-black/5", className)}
    />
  );
}

/** Logotipo completo sin fondo (usar sobre fondos claros). */
export function LogoFull({ className }: { className?: string }) {
  return <img src="/brand/logo.webp" alt="Cel i Animació · Momentos divertidos" width={480} height={400} className={cn("h-auto w-48", className)} />;
}

/** Nombre en texto con los colores de la marca. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-extrabold tracking-tight", className)}>
      <span style={{ color: BRAND_COLORS.blue }}>Cel</span> <span style={{ color: BRAND_COLORS.red }}>i</span>{" "}
      <span style={{ color: BRAND_COLORS.orange }}>Animació</span>
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
