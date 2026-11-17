import type { AuditFields, EntityId } from "./common";

export const ASSIGNMENT_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export const WORKER_RESPONSES = ["pending", "accepted", "declined"] as const;
export type WorkerResponse = (typeof WORKER_RESPONSES)[number];

export const WORKER_RESPONSE_LABELS: Record<WorkerResponse, string> = {
  pending: "Sin respuesta",
  accepted: "Ha dicho que sí",
  declined: "Ha dicho que no",
};

/** assignments/{shiftId}_{employeeId} — id determinista: evita duplicados por diseño. */
export interface Assignment extends AuditFields {
  id: EntityId;
  shiftId: EntityId;
  eventId: EntityId;
  employeeId: EntityId;
  employeeName: string;
  eventName: string;
  shiftName: string;
  /** Copia de las horas del turno para detectar solapes con una sola consulta. */
  shiftStartAt: Date;
  shiftEndAt: Date;
  status: AssignmentStatus;
  cancelledReason: string;
  /** Transporte / cómo llega el monitor (lo indica administración). */
  transport: string;
  /** Respuesta del propio trabajador a la asignación. */
  workerResponse: WorkerResponse;
  responseAt: Date | null;
}

export interface AssignmentConflict {
  assignmentId: EntityId;
  shiftId: EntityId;
  eventName: string;
  shiftName: string;
  startAt: Date;
  endAt: Date;
}
