import type { AuditFields, EntityId, ISODate } from "./common";

export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

/** employees/{employeeId} — ficha laboral (datos privados). */
export interface Employee extends AuditFields {
  id: EntityId;
  firstName: string;
  lastName: string;
  email: string;
  /** Email en minúsculas, usado para vincular la cuenta con la invitación. */
  emailLower: string;
  phone: string;
  position: string;
  hireDate: ISODate | null;
  status: EmployeeStatus;
  /** URL pública opcional de la fotografía (ver docs: Storage no está disponible en Spark). */
  photoURL: string | null;
  /** uid de la cuenta vinculada; null hasta que el trabajador activa su acceso. */
  userId: EntityId | null;
  notes: string;
}

export const INVITATION_STATUSES = ["pending", "accepted", "revoked"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** invitations/{emailLower} — autoriza a un email verificado a vincularse a una ficha. */
export interface Invitation {
  id: string; // = emailLower
  email: string;
  employeeId: EntityId;
  /** Nombre con el que se creará el perfil del trabajador. */
  displayName: string;
  role: "worker";
  status: InvitationStatus;
  createdAt: Date | null;
  createdBy: EntityId | null;
  acceptedBy: EntityId | null;
  acceptedAt: Date | null;
}

export function employeeFullName(e: Pick<Employee, "firstName" | "lastName">): string {
  return `${e.firstName} ${e.lastName}`.trim();
}
