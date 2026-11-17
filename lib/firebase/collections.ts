/** Nombres de colecciones centralizados (deben coincidir con firestore.rules). */
export const COLLECTIONS = {
  users: "users",
  employees: "employees",
  invitations: "invitations",
  locations: "locations",
  events: "events",
  eventPrivate: "eventPrivate",
  shifts: "shifts",
  shiftTeams: "shiftTeams",
  availability: "availability",
  assignments: "assignments",
  attendanceSessions: "attendanceSessions",
  breakRecords: "breakRecords",
  notifications: "notifications",
  auditLogs: "auditLogs",
  settings: "settings",
} as const;

export const assignmentId = (shiftId: string, employeeId: string) => `${shiftId}_${employeeId}`;
export const attendanceSessionId = (shiftId: string, employeeId: string) => `${shiftId}_${employeeId}`;
export const availabilityId = (employeeId: string, weekStart: string) => `${employeeId}_${weekStart}`;
export const breakRecordId = (sessionId: string, index: number) => `${sessionId}_${index}`;
