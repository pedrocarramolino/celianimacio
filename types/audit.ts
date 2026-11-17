import type { EntityId } from "./common";

export const AUDIT_ENTITIES = [
  "user",
  "employee",
  "invitation",
  "location",
  "event",
  "shift",
  "assignment",
  "attendance",
  "availability",
  "settings",
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

/** auditLogs/{id} — solo inserción. Ver docs: en Spark el cliente puede omitir registros. */
export interface AuditLog {
  id: EntityId;
  actorUid: EntityId;
  action: string;
  entityType: AuditEntity;
  entityId: EntityId;
  summary: string;
  at: Date | null;
}
