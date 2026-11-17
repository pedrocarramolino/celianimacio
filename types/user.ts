import type { AuditFields, EntityId } from "./common";

export const USER_ROLES = ["admin", "worker"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  worker: "Trabajador",
};

/** users/{uid} — perfil de acceso. El id del documento es el uid de Firebase Auth. */
export interface AppUser extends AuditFields {
  id: EntityId; // = uid
  email: string;
  displayName: string;
  role: UserRole;
  /** Ficha de empleado vinculada (null para administradores sin ficha). */
  employeeId: EntityId | null;
  active: boolean;
}

/** Sesión autenticada resuelta por AuthService (independiente de Firebase). */
export interface AuthSession {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Rol efectivo: custom claim si existe; si no, el del documento users/{uid}. */
  role: UserRole | null;
  roleSource: "claims" | "document" | "none";
  profile: AppUser | null;
}
