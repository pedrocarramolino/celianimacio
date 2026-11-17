import { Logo } from "./logo";
import { Alert } from "@/components/ui/alert";

export function ConfigMissing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-6">
      <Logo subtitle="Configuración pendiente" />
      <Alert variant="warning" title="Firebase no está configurado">
        <p>
          Copia <code>.env.example</code> a <code>.env.local</code>, rellena los valores públicos de tu app web de Firebase y vuelve
          a compilar. Consulta <code>docs/INSTALACION.md</code>.
        </p>
      </Alert>
    </main>
  );
}
