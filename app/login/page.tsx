"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/features/auth/auth-layout";
import { homePathFor, useAuth } from "@/features/auth/auth-provider";
import { loginSchema, type LoginValues } from "@/schemas/auth";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ConfigMissing } from "@/components/layout/config-missing";
import { errorMessage } from "@/utils/errors";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, configured, error: sessionError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (!loading && session) router.replace(homePathFor(session));
  }, [loading, session, router]);

  if (!configured) return <ConfigMissing />;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await authService.signIn(values.email, values.password);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout title="Iniciar sesión" description="Accede con el correo y la contraseña de tu cuenta.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {(error || sessionError) && <Alert variant="error">{error ?? sessionError}</Alert>}
        <FormField id="email" label="Correo electrónico" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message} required>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting || (loading && !!session)}>
          Entrar
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-sm">
        <Link href="/recuperar/" className="text-primary hover:underline">
          ¿Has olvidado la contraseña?
        </Link>
        <p className="text-muted-foreground">
          ¿Te han invitado al equipo?{" "}
          <Link href="/activar/" className="font-medium text-primary hover:underline">
            Activa tu cuenta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
