import { Logo } from "@/components/layout/logo";

export function AuthLayout({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/5" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-white/5" aria-hidden />
        <p className="relative text-lg font-semibold tracking-tight">Cel i Animació</p>
        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">Eventos, equipos y turnos en un solo lugar.</h2>
          <p className="text-primary-foreground/80">
            Disponibilidad semanal, asignaciones, fichajes con ubicación y avisos para todo el personal.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">Acceso privado para el equipo</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <Logo className="lg:hidden" />
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
