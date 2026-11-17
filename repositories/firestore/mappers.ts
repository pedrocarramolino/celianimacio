import { Timestamp, type DocumentData } from "firebase/firestore";
import {
  ASSIGNMENT_STATUSES,
  ATTENDANCE_STATUSES,
  DAY_AVAILABILITY_STATUSES,
  EMPLOYEE_STATUSES,
  EVENT_STATUSES,
  INCIDENT_TYPES,
  INVITATION_STATUSES,
  NOTIFICATION_TYPES,
  SHIFT_STATUSES,
  USER_ROLES,
  AUDIT_ENTITIES,
  DEFAULT_SETTINGS,
  type AppNotification,
  type AppUser,
  type Assignment,
  type AttendanceIncident,
  type AttendancePunch,
  type AttendanceSession,
  type AuditLog,
  type BreakRecord,
  type CompanyEvent,
  type CompanySettings,
  type DayAvailability,
  type Employee,
  type Invitation,
  type Location,
  type LocationSnapshot,
  type Shift,
  type ShiftTeam,
  type WeeklyAvailability,
} from "@/types";
import { bool, num, oneOf, str, strArray, strOrNull, toDate, toDateStrict } from "@/lib/firebase/converters";

const audit = (d: DocumentData) => ({
  createdAt: toDate(d.createdAt),
  updatedAt: toDate(d.updatedAt),
  createdBy: strOrNull(d, "createdBy"),
});

export function mapUser(id: string, d: DocumentData): AppUser {
  return {
    id,
    email: str(d, "email"),
    displayName: str(d, "displayName"),
    role: oneOf(d.role, USER_ROLES, "worker"),
    employeeId: strOrNull(d, "employeeId"),
    active: bool(d, "active"),
    ...audit(d),
  };
}

export function mapEmployee(id: string, d: DocumentData): Employee {
  return {
    id,
    firstName: str(d, "firstName"),
    lastName: str(d, "lastName"),
    email: str(d, "email"),
    emailLower: str(d, "emailLower"),
    phone: str(d, "phone"),
    position: str(d, "position"),
    hireDate: strOrNull(d, "hireDate"),
    status: oneOf(d.status, EMPLOYEE_STATUSES, "inactive"),
    photoURL: strOrNull(d, "photoURL"),
    userId: strOrNull(d, "userId"),
    notes: str(d, "notes"),
    ...audit(d),
  };
}

export function mapInvitation(id: string, d: DocumentData): Invitation {
  return {
    id,
    email: str(d, "email"),
    employeeId: str(d, "employeeId"),
    displayName: str(d, "displayName"),
    role: "worker",
    status: oneOf(d.status, INVITATION_STATUSES, "revoked"),
    createdAt: toDate(d.createdAt),
    createdBy: strOrNull(d, "createdBy"),
    acceptedBy: strOrNull(d, "acceptedBy"),
    acceptedAt: toDate(d.acceptedAt),
  };
}

export function mapLocationSnapshot(v: unknown): LocationSnapshot | null {
  if (!v || typeof v !== "object") return null;
  const d = v as DocumentData;
  return {
    locationId: strOrNull(d, "locationId"),
    name: str(d, "name"),
    address: str(d, "address"),
    lat: num(d, "lat"),
    lng: num(d, "lng"),
    radiusMeters: num(d, "radiusMeters", 200),
  };
}

export function mapLocation(id: string, d: DocumentData): Location {
  return {
    id,
    name: str(d, "name"),
    address: str(d, "address"),
    lat: num(d, "lat"),
    lng: num(d, "lng"),
    radiusMeters: num(d, "radiusMeters", 200),
    notes: str(d, "notes"),
    ...audit(d),
  };
}

export function mapEvent(id: string, d: DocumentData): CompanyEvent {
  return {
    id,
    name: str(d, "name"),
    description: str(d, "description"),
    date: str(d, "date"),
    location: mapLocationSnapshot(d.location) ?? {
      locationId: null,
      name: "",
      address: "",
      lat: 0,
      lng: 0,
      radiusMeters: 200,
    },
    instructions: str(d, "instructions"),
    status: oneOf(d.status, EVENT_STATUSES, "draft"),
    staffEmployeeIds: strArray(d, "staffEmployeeIds"),
    shiftCount: num(d, "shiftCount"),
    ...audit(d),
  };
}

export function mapShift(id: string, d: DocumentData): Shift {
  return {
    id,
    eventId: str(d, "eventId"),
    eventName: str(d, "eventName"),
    name: str(d, "name"),
    date: str(d, "date"),
    startAt: toDateStrict(d.startAt),
    endAt: toDateStrict(d.endAt),
    requiredWorkers: num(d, "requiredWorkers", 1),
    position: str(d, "position"),
    location: mapLocationSnapshot(d.location),
    instructions: str(d, "instructions"),
    status: oneOf(d.status, SHIFT_STATUSES, "open"),
    staffEmployeeIds: strArray(d, "staffEmployeeIds"),
    confirmedEmployeeIds: strArray(d, "confirmedEmployeeIds"),
    ...audit(d),
  };
}

export function mapShiftTeam(id: string, d: DocumentData): ShiftTeam {
  const members = Array.isArray(d.members) ? (d.members as DocumentData[]) : [];
  return {
    id,
    shiftId: str(d, "shiftId"),
    eventId: str(d, "eventId"),
    memberEmployeeIds: strArray(d, "memberEmployeeIds"),
    members: members.map((m) => ({
      employeeId: str(m, "employeeId"),
      displayName: str(m, "displayName"),
      position: str(m, "position"),
    })),
    updatedAt: toDate(d.updatedAt),
  };
}

export function mapAvailability(id: string, d: DocumentData): WeeklyAvailability {
  const days = Array.isArray(d.days) ? (d.days as DocumentData[]) : [];
  return {
    id,
    employeeId: str(d, "employeeId"),
    weekStart: str(d, "weekStart"),
    days: days.map(
      (day): DayAvailability => ({
        date: str(day, "date"),
        status: oneOf(day.status, DAY_AVAILABILITY_STATUSES, "unset"),
        slots: (Array.isArray(day.slots) ? (day.slots as DocumentData[]) : []).map((s) => ({
          start: str(s, "start"),
          end: str(s, "end"),
        })),
      }),
    ),
    note: str(d, "note"),
    updatedAt: toDate(d.updatedAt),
    updatedBy: strOrNull(d, "updatedBy"),
  };
}

export function mapAssignment(id: string, d: DocumentData): Assignment {
  return {
    id,
    shiftId: str(d, "shiftId"),
    eventId: str(d, "eventId"),
    employeeId: str(d, "employeeId"),
    employeeName: str(d, "employeeName"),
    eventName: str(d, "eventName"),
    shiftName: str(d, "shiftName"),
    shiftStartAt: toDateStrict(d.shiftStartAt),
    shiftEndAt: toDateStrict(d.shiftEndAt),
    status: oneOf(d.status, ASSIGNMENT_STATUSES, "cancelled"),
    cancelledReason: str(d, "cancelledReason"),
    ...audit(d),
  };
}

export function mapPunch(v: unknown): AttendancePunch | null {
  if (!v || typeof v !== "object") return null;
  const d = v as DocumentData;
  const coords = d.coords && typeof d.coords === "object" ? (d.coords as DocumentData) : null;
  return {
    clientAt: toDateStrict(d.clientAt),
    serverAt: toDate(d.serverAt),
    coords: coords ? { lat: num(coords, "lat"), lng: num(coords, "lng") } : null,
    accuracyMeters: typeof d.accuracyMeters === "number" ? d.accuracyMeters : null,
    distanceMeters: typeof d.distanceMeters === "number" ? d.distanceMeters : null,
    withinRadius: typeof d.withinRadius === "boolean" ? d.withinRadius : null,
    validation: d.validation === "server" ? "server" : "client",
  };
}

function mapIncidents(v: unknown): AttendanceIncident[] {
  if (!Array.isArray(v)) return [];
  return (v as DocumentData[]).map((i) => ({
    type: oneOf(i.type, INCIDENT_TYPES, "location_unavailable"),
    stage: oneOf(i.stage, ["check_in", "break_start", "break_end", "check_out"] as const, "check_in"),
    message: str(i, "message"),
    at: toDateStrict(i.at),
  }));
}

export function mapSession(id: string, d: DocumentData): AttendanceSession {
  return {
    id,
    shiftId: str(d, "shiftId"),
    eventId: str(d, "eventId"),
    employeeId: str(d, "employeeId"),
    userId: str(d, "userId"),
    employeeName: str(d, "employeeName"),
    eventName: str(d, "eventName"),
    shiftName: str(d, "shiftName"),
    shiftStartAt: toDateStrict(d.shiftStartAt),
    shiftEndAt: toDateStrict(d.shiftEndAt),
    status: oneOf(d.status, ATTENDANCE_STATUSES, "open"),
    checkIn: mapPunch(d.checkIn) ?? {
      clientAt: new Date(0),
      serverAt: null,
      coords: null,
      accuracyMeters: null,
      distanceMeters: null,
      withinRadius: null,
      validation: "client",
    },
    checkOut: mapPunch(d.checkOut),
    breakCount: num(d, "breakCount"),
    totalBreakMinutes: num(d, "totalBreakMinutes"),
    workedMinutes: typeof d.workedMinutes === "number" ? d.workedMinutes : null,
    incidents: mapIncidents(d.incidents),
    hasIncident: bool(d, "hasIncident"),
    adminNote: str(d, "adminNote"),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export function mapBreak(id: string, d: DocumentData): BreakRecord {
  return {
    id,
    sessionId: str(d, "sessionId"),
    employeeId: str(d, "employeeId"),
    userId: str(d, "userId"),
    index: num(d, "index"),
    start: mapPunch(d.start) ?? {
      clientAt: new Date(0),
      serverAt: null,
      coords: null,
      accuracyMeters: null,
      distanceMeters: null,
      withinRadius: null,
      validation: "client",
    },
    end: mapPunch(d.end),
    durationMinutes: typeof d.durationMinutes === "number" ? d.durationMinutes : null,
  };
}

export function mapNotification(id: string, d: DocumentData): AppNotification {
  return {
    id,
    type: oneOf(d.type, NOTIFICATION_TYPES, "general"),
    title: str(d, "title"),
    body: str(d, "body"),
    link: strOrNull(d, "link"),
    recipientEmployeeId: strOrNull(d, "recipientEmployeeId"),
    recipientRole: d.recipientRole === "admin" ? "admin" : null,
    read: bool(d, "read"),
    readAt: toDate(d.readAt),
    createdAt: toDate(d.createdAt),
    createdBy: strOrNull(d, "createdBy"),
  };
}

export function mapAudit(id: string, d: DocumentData): AuditLog {
  return {
    id,
    actorUid: str(d, "actorUid"),
    action: str(d, "action"),
    entityType: oneOf(d.entityType, AUDIT_ENTITIES, "settings"),
    entityId: str(d, "entityId"),
    summary: str(d, "summary"),
    at: toDate(d.at),
  };
}

export function mapSettings(d: DocumentData | undefined): CompanySettings {
  if (!d) return DEFAULT_SETTINGS;
  return {
    companyName: str(d, "companyName", DEFAULT_SETTINGS.companyName),
    timezone: str(d, "timezone", DEFAULT_SETTINGS.timezone),
    defaultRadiusMeters: num(d, "defaultRadiusMeters", DEFAULT_SETTINGS.defaultRadiusMeters),
    maxAccuracyMeters: num(d, "maxAccuracyMeters", DEFAULT_SETTINGS.maxAccuracyMeters),
    checkInEarlyMinutes: num(d, "checkInEarlyMinutes", DEFAULT_SETTINGS.checkInEarlyMinutes),
    updatedAt: toDate(d.updatedAt),
  };
}

// ---- Serialización ----------------------------------------------------------

export function ts(d: Date): Timestamp {
  return Timestamp.fromDate(d);
}

export function serializeLocationSnapshot(l: LocationSnapshot) {
  return {
    locationId: l.locationId,
    name: l.name,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    radiusMeters: l.radiusMeters,
  };
}
