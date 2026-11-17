"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { homePathFor, useAuth } from "@/features/auth/auth-provider";
import { registerSchema, type RegisterValues } from "@/schemas/auth";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ConfigMissing } from "@/components/layout/config-missing";
import { FullScreenLoader } from "@/components/layout/states";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/utils/errors";

/**
 * Activación de trabajadores invitados (compatible con Spark, sin backend):
 *  1. El administrador crea la ficha y una invitación para el email del trabajador.
 *  2. El trabajador crea aquí su cuenta (registro estándar de Firebase Auth) y verifica el email.
 *  3. Con el email verificado, las reglas le permiten crear su perfil con rol "worker"
 *     vinculado a la ficha de la invitación. Nunca puede elegir su rol.
 */
export default function ActivatePage() {
  const { session, loading, configured, refresh, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session?.role) router.replace(homePathFor(session));
  }, [loading, session, router]);

  if (!configured) return <ConfigMissing />;
  if (loading) return <FullScreenLoader />;
  if (session?.role) return <FullScreenLoader label="Redirigiendo…" />;

  return (
    <AuthLayout title="Activar cuenta" description="Para trabajadores invitados por Cel i Animació.">
      {!session ? (
        <RegisterStep />
      ) : !session.emailVerified ? (
        <VerifyStep email={session.email} onVerified={refresh} onSignOut={signOut} />
      ) : (
        <InvitationStep onActivated={refresh} onSignOut={signOut} />
      )}
    </AuthLayout>
  );
}

function RegisterStep() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.registerInvitedAccount(v.email, v.password);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <>
      <Alert variant="info">
        Usa exactamente el correo al que la empresa ha enviado tu invitación. Después deberás verificarlo.
      </Alert>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField id="email" label="Correo electrónico" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números." required>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </FormField>
        <FormField id="confirm" label="Repite la contraseña" error={errors.confirm?.message} required>
          <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        ¿Ya creaste la cuenta?{" "}
        <Link href="/login/" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>{" "}
        y vuelve a esta página.
      </p>
    </>
  );
}

function VerifyStep({ email, onVerified, onSignOut }: { email: string; onVerified: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const [msg, setMsg] = useState<{ kind: "error" | "success" | "warning"; text: string } | null>(null);
  const [busy, setBusy] = useState<"check" | "resend" | null>(null);

  async function check() {
    setBusy("check");
    setMsg(null);
    try {
      const { emailVerified } = await authService.refresh();
      if (emailVerified) await onVerified();
      else setMsg({ kind: "warning", text: "Todavía no consta como verificado. Abre el enlace del correo y vuelve a intentarlo." });
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }
  async function resend() {
    setBusy("resend");
    setMsg(null);
    try {
      await authService.resendVerification();
      setMsg({ kind: "success", text: "Correo reenviado." });
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <MailCheck className="mt-0.5 size-5 text-primary" />
        <p className="text-sm">
          Hemos enviado un enlace de verificación a <strong>{email}</strong>. Ábrelo y después pulsa “Ya lo he verificado”.
        </p>
      </div>
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
      <Button className="w-full" size="lg" onClick={check} loading={busy === "check"}>
        Ya lo he verificado
      </Button>
      <div className="flex justify-between">
        <Button variant="link" onClick={resend} disabled={busy !== null}>
          Reenviar correo
        </Button>
        <Button variant="link" onClick={() => void onSignOut()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

function InvitationStep({ onActivated, onSignOut }: { onActivated: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const invitation = useAsync(() => authService.findMyInvitation(), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await authService.activateInvitation();
      await onActivated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (invitation.loading) return <FullScreenLoader label="Buscando tu invitación…" />;
  const inv = invitation.data;
  return (
    <div className="space-y-4">
      {invitation.error && <Alert variant="error">{invitation.error}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {inv && inv.status === "pending" ? (
        <>
          <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <ShieldCheck className="mt-0.5 size-5 text-success" />
            <div className="text-sm">
              <p className="font-medium">Invitación encontrada</p>
              <p className="text-muted-foreground">
                Se vinculará tu cuenta a la ficha de <strong>{inv.displayName}</strong> con el rol de trabajador.
              </p>
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={activate} loading={busy}>
            Activar mi cuenta
          </Button>
        </>
      ) : (
        <Alert variant="warning" title="No hay invitación pendiente">
          No encontramos ninguna invitación activa para este correo. Pide a la empresa que te invite con esta dirección o que
          revise si la invitación fue revocada.
        </Alert>
      )}
      <Button variant="link" onClick={() => void onSignOut()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
