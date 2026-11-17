import { Logo } from "@/components/layout/logo";
import { BRAND } from "@/lib/brand";

/** Globos decorativos (ilustración propia en SVG). */
function Balloons({ className }: { className?: string }) {
  const balloon = (x: number, y: number, r: number, fill: string, string: number) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x} ${y + r * 1.15} q ${r * 0.25} ${string / 3} 0 ${string / 1.5} t 0 ${string / 3}`} stroke="rgba(255,255,255,.45)" strokeWidth="1.5" fill="none" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.18} fill={fill} />
      <path d={`M${x - 4} ${y + r * 1.15} l4 6 l4 -6 z`} fill={fill} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.18} ry={r * 0.3} fill="rgba(255,255,255,.35)" />
    </g>
  );
  return (
    <svg viewBox="0 0 260 260" className={className} aria-hidden>
      {balloon(70, 70, 34, "#f4a259", 120)}
      {balloon(140, 50, 40, "#9fd3cf", 140)}
      {balloon(205, 90, 30, "#f28482", 110)}
      {balloon(110, 120, 26, "#f6d55c", 90)}
    </svg>
  );
}

export function AuthLayout({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/5" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-white/5" aria-hidden />
        <Balloons className="absolute right-8 top-10 w-64 opacity-90" />
        <div className="relative">
          <p className="text-lg font-semibold tracking-tight">{BRAND.name}</p>
          <p className="text-sm text-primary-foreground/70">{BRAND.tagline}</p>
        </div>
        <div className="relative max-w-md space-y-5">
          <h2 className="text-3xl font-semibold leading-tight">Cada fiesta, con el equipo perfecto. 🎈</h2>
          <p className="text-primary-foreground/80">
            Organiza eventos y turnos, consulta la disponibilidad del equipo y controla los fichajes desde el móvil.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Servicios">
            {BRAND.services.map((s) => (
              <li key={s} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/60">
          {BRAND.area} · Acceso privado para el equipo
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-3 lg:hidden">
            <Logo subtitle={BRAND.tagline} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
