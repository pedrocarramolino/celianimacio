"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/features/auth/auth-layout";
import { resetSchema, type ResetValues } from "@/schemas/auth";
import { authService } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { errorMessage } from "@/utils/errors";

export default function RecoverPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      // No revelamos si el correo existe: solo mostramos errores de red/formato.
      const code = (e as { code?: string }).code;
      if (code === "auth/user-not-found") setSent(true);
      else setError(errorMessage(e));
    }
  });

  return (
    <AuthLayout title="Recuperar contraseña" description="Te enviaremos un enlace para crear una contraseña nueva.">
      {sent ? (
        <Alert variant="success" title="Revisa tu correo">
          Si existe una cuenta con ese correo, recibirás un enlace de Firebase para restablecer la contraseña. Revisa también la
          carpeta de spam.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert variant="error">{error}</Alert>}
          <FormField id="email" label="Correo electrónico" error={form.formState.errors.email?.message} required>
            <Input type="email" autoComplete="email" {...form.register("email")} />
          </FormField>
          <Button type="submit" className="w-full" size="lg" loading={form.formState.isSubmitting}>
            Enviar enlace
          </Button>
        </form>
      )}
      <Link href="/login/" className="text-sm text-primary hover:underline">
        Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
