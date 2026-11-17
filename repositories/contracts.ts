/**
 * Contratos de acceso a datos. Los servicios dependen de estas interfaces, nunca de Firestore.
 * Para migrar a una API propia o a Cloud Functions basta con escribir otra implementación
 * (p. ej. repositories/http/*) y cambiar el cableado en services/index.ts.
 */
import type {
  AppNotification,
  AppUser,
  Assignment,
  AssignmentStatus,
  AttendanceIncident,
  AttendancePunch,
  AttendanceSession,
  AuditEntity,
  AuditLog,
  BreakRecord,
  CompanyEvent,
  CompanySettings,
  Employee,
  EntityId,
  EventCategory,
  EventStatus,
  Invitation,
  ISODate,
  Location,
  LocationSnapshot,
  NotificationType,
  Shift,
  ShiftStatus,
  ShiftTeam,
  UserRole,
  WeeklyAvailability,
} from "@/types";

export interface Actor {
  uid: string;
}

// ---------------------------------------------------------------- users / auth
export interface UserRepository {
  getById(uid: string): Promise<AppUser | null>;
  list(): Promise<AppUser[]>;
  updateByAdmin(uid: string, patch: { role?: UserRole; active?: boolean; displayName?: string; employeeId?: string | null }): Promise<void>;
  updateOwnDisplayName(uid: string, displayName: string): Promise<void>;
}

export interface InvitationRepository {
  getByEmail(emailLower: string): Promise<Invitation | null>;
  listByEmployee(employeeId: EntityId): Promise<Invitation[]>;
  create(input: { email: string; employeeId: EntityId; displayName: string }, actor: Actor): Promise<void>;
  revoke(emailLower: string): Promise<void>;
  /** Lote atómico: crea users/{uid}, vincula la ficha y marca la invitación como aceptada. */
  accept(params: { uid: string; email: string; displayName: string; invitation: Invitation }): Promise<void>;
}

// ------------------------------------------------------------------- employees
export type EmployeeInput = Omit<Employee, "id" | "createdAt" | "updatedAt" | "createdBy" | "emailLower" | "userId">;

export interface EmployeeRepository {
  list(): Promise<Employee[]>;
  getById(id: EntityId): Promise<Employee | null>;
  getByUserId(uid: string): Promise<Employee | null>;
  create(input: EmployeeInput, actor: Actor, options: { invite: boolean }): Promise<EntityId>;
  update(id: EntityId, input: EmployeeInput): Promise<void>;
  updateOwnPhone(id: EntityId, phone: string): Promise<void>;
}

// ------------------------------------------------------------------- locations
export type LocationInput = Omit<Location, "id" | "createdAt" | "updatedAt" | "createdBy">;

export interface LocationRepository {
  list(): Promise<Location[]>;
  create(input: LocationInput, actor: Actor): Promise<EntityId>;
  update(id: EntityId, input: LocationInput): Promise<void>;
  remove(id: EntityId): Promise<void>;
}

// ---------------------------------------------------------------------- events
export interface EventInput {
  name: string;
  description: string;
  date: ISODate;
  location: LocationSnapshot;
  instructions: string;
  status: EventStatus;
  category: EventCategory;
}

export interface EventRepository {
  list(): Promise<CompanyEvent[]>;
  listFrom(fromDate: ISODate, max?: number): Promise<CompanyEvent[]>;
  getById(id: EntityId): Promise<CompanyEvent | null>;
  create(input: EventInput, actor: Actor): Promise<EntityId>;
  /** Actualiza el evento. Si cambia el nombre, lo propaga a turnos y asignaciones (mismo lote). */
  update(id: EntityId, input: EventInput, rename?: { shiftIds: EntityId[]; assignmentIds: EntityId[] }): Promise<void>;
  /** Cancela el evento, sus turnos y asignaciones activas en un único lote. */
  cancelCascade(params: {
    event: CompanyEvent;
    shifts: Shift[];
    activeAssignments: Assignment[];
    reason: string;
    notifications: NotificationDraft[];
  }, actor: Actor): Promise<void>;
}

// ---------------------------------------------------------------------- shifts
export interface ShiftInput {
  name: string;
  date: ISODate;
  startAt: Date;
  endAt: Date;
  requiredWorkers: number;
  position: string;
  location: LocationSnapshot | null;
  instructions: string;
}

export interface ShiftRepository {
  getById(id: EntityId): Promise<Shift | null>;
  listByEvent(eventId: EntityId): Promise<Shift[]>;
  listByDateRange(from: ISODate, toInclusive: ISODate): Promise<Shift[]>;
  create(event: CompanyEvent, input: ShiftInput, status: ShiftStatus, actor: Actor): Promise<EntityId>;
  /** Actualiza el turno y propaga las horas a sus asignaciones activas (mismo lote). */
  update(
    shift: Shift,
    input: ShiftInput,
    status: ShiftStatus,
    activeAssignments: Assignment[],
    notifications: NotificationDraft[],
    actor: Actor,
  ): Promise<void>;
  cancel(params: {
    shift: Shift;
    event: CompanyEvent;
    activeAssignments: Assignment[];
    reason: string;
    nextEventStaffEmployeeIds: EntityId[];
    notifications: NotificationDraft[];
  }, actor: Actor): Promise<void>;
  getTeam(shiftId: EntityId): Promise<ShiftTeam | null>;
}

// ----------------------------------------------------------------- assignments
export interface AssignmentMutation {
  shiftId: EntityId;
  employeeId: EntityId;
  employeeName: string;
  employeePosition: string;
  nextStatus: AssignmentStatus;
  cancelledReason: string;
  /** ¿Sigue el empleado en otro turno activo del mismo evento? (para la proyección del evento) */
  employeeHasOtherShiftsInEvent: boolean;
  notification: NotificationDraft | null;
}

export interface AssignmentRepository {
  getById(id: EntityId): Promise<Assignment | null>;
  listByShift(shiftId: EntityId): Promise<Assignment[]>;
  listByEvent(eventId: EntityId): Promise<Assignment[]>;
  listByEmployee(employeeId: EntityId): Promise<Assignment[]>;
  /** Asignaciones del empleado cuyo fin es posterior a `after` (para detectar solapes). */
  listByEmployeeEndingAfter(employeeId: EntityId, after: Date): Promise<Assignment[]>;
  listInRange(from: Date, to: Date): Promise<Assignment[]>;
  /** Transacción: asignación + proyecciones en turno, evento y equipo + notificación. */
  applyMutation(mutation: AssignmentMutation, actor: Actor): Promise<void>;
}

// ---------------------------------------------------------------- availability
export interface AvailabilityRepository {
  get(employeeId: EntityId, weekStart: ISODate): Promise<WeeklyAvailability | null>;
  listByWeek(weekStart: ISODate): Promise<WeeklyAvailability[]>;
  save(value: Omit<WeeklyAvailability, "id" | "updatedAt" | "updatedBy">, actor: Actor): Promise<void>;
}

// ------------------------------------------------------------------ attendance
export interface CheckInWrite {
  session: Omit<AttendanceSession, "id" | "createdAt" | "updatedAt" | "checkIn"> & { checkIn: AttendancePunch };
  notification: NotificationDraft | null;
}

export interface AttendanceRepository {
  getSession(id: EntityId): Promise<AttendanceSession | null>;
  listSessionsByUser(uid: string, max?: number): Promise<AttendanceSession[]>;
  listSessionsByEmployee(employeeId: EntityId): Promise<AttendanceSession[]>;
  listSessionsInRange(from: Date, to: Date): Promise<AttendanceSession[]>;
  listOpenSessions(): Promise<AttendanceSession[]>;
  /** Pausas de una jornada. Se filtra también por userId para cumplir las reglas (lectura propia). */
  listBreaks(session: Pick<AttendanceSession, "id" | "userId">): Promise<BreakRecord[]>;
  checkIn(write: CheckInWrite): Promise<EntityId>;
  startBreak(session: AttendanceSession, punch: AttendancePunch, incidents: AttendanceIncident[], notification: NotificationDraft | null): Promise<void>;
  endBreak(session: AttendanceSession, openBreak: BreakRecord, punch: AttendancePunch, durationMinutes: number, incidents: AttendanceIncident[], notification: NotificationDraft | null): Promise<void>;
  checkOut(session: AttendanceSession, punch: AttendancePunch, workedMinutes: number, incidents: AttendanceIncident[], notification: NotificationDraft | null): Promise<void>;
  adminClose(session: AttendanceSession, params: { checkOutAt: Date; workedMinutes: number; note: string; incidents: AttendanceIncident[] }): Promise<void>;
}

// --------------------------------------------------------------- notifications
export interface NotificationDraft {
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  recipientEmployeeId: EntityId | null;
  recipientRole: "admin" | null;
}

export interface NotificationRepository {
  listForEmployee(employeeId: EntityId, max?: number): Promise<AppNotification[]>;
  listForAdmins(max?: number): Promise<AppNotification[]>;
  createMany(drafts: NotificationDraft[], actor: Actor): Promise<void>;
  markRead(id: EntityId): Promise<void>;
  remove(id: EntityId): Promise<void>;
}

// ----------------------------------------------------------------- audit / cfg
export interface AuditRepository {
  log(entry: { action: string; entityType: AuditEntity; entityId: string; summary: string }, actor: Actor): Promise<void>;
  listRecent(max?: number): Promise<AuditLog[]>;
}

export interface SettingsRepository {
  get(): Promise<CompanySettings>;
  save(value: Omit<CompanySettings, "updatedAt">): Promise<void>;
}
