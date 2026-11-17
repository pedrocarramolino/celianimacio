"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { authService } from "@/services";
import { setCurrentSession } from "@/services/session";
import type { AuthSession } from "@/types";
import { errorMessage } from "@/utils/errors";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const unsubscribe = authService.onSessionChange(
      (s) => {
        setCurrentSession(s);
        setSession(s);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setCurrentSession(null);
        setSession(null);
        setError(errorMessage(e));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [configured]);

  const refresh = useCallback(async () => {
    const user = authService.currentUser();
    if (!user) return;
    const s = await authService.resolveSession(user);
    setCurrentSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setCurrentSession(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, error, configured, refresh, signOut }),
    [session, loading, error, configured, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Ruta de inicio según el estado de la sesión. */
export function homePathFor(session: AuthSession | null): string {
  if (!session) return "/login/";
  if (session.role === "admin") return "/admin/";
  if (session.role === "worker") return "/trabajador/";
  return "/activar/";
}
