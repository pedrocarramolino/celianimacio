"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";
import { homePathFor, useAuth } from "./auth-provider";
import { FullScreenLoader } from "@/components/layout/states";
import { ConfigMissing } from "@/components/layout/config-missing";

/**
 * Protección de rutas en el cliente (la app es estática). Evita mostrar pantallas a quien
 * no corresponde; la protección REAL de los datos la aplican las reglas de Firestore.
 */
export function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, loading, configured } = useAuth();
  const router = useRouter();
  const allowed = session?.role === role;

  useEffect(() => {
    if (!configured || loading) return;
    if (!allowed) router.replace(homePathFor(session));
  }, [allowed, configured, loading, router, session]);

  if (!configured) return <ConfigMissing />;
  if (loading || !allowed) return <FullScreenLoader label="Comprobando acceso…" />;
  return <>{children}</>;
}
