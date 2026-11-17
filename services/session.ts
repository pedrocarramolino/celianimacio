import type { AuthSession } from "@/types";
import { AppError } from "@/utils/errors";
import type { Actor } from "@/repositories/contracts";

/**
 * Sesión actual accesible desde los servicios. La establece AuthProvider.
 * Estas comprobaciones mejoran la experiencia; la autorización real la imponen firestore.rules.
 */
let current: AuthSession | null = null;

export function setCurrentSession(session: AuthSession | null): void {
  current = session;
}

export function getCurrentSession(): AuthSession | null {
  return current;
}

export function requireActor(): Actor {
  if (!current) throw new AppError("Debes iniciar sesión.", "auth/unauthenticated");
  return { uid: current.uid };
}

export function requireAdmin(): Actor {
  const actor = requireActor();
  if (current?.role !== "admin") throw new AppError("Esta acción requiere permisos de administrador.", "permission-denied");
  return actor;
}

export function requireEmployeeId(): string {
  requireActor();
  const id = current?.profile?.employeeId;
  if (!id) throw new AppError("Tu cuenta no está vinculada a una ficha de trabajador.", "permission-denied");
  return id;
}
