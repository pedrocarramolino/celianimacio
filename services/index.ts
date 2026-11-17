/**
 * Composición de dependencias. Es el ÚNICO lugar que decide qué implementación de repositorios
 * se usa. Para migrar a un backend propio o Cloud Functions, sustituye aquí las clases
 * Firestore* por implementaciones HTTP sin tocar componentes ni servicios.
 */
import { FirestoreAssignmentRepository } from "@/repositories/firestore/assignment.repository";
import { FirestoreAttendanceRepository } from "@/repositories/firestore/attendance.repository";
import { FirestoreAuditRepository } from "@/repositories/firestore/audit.repository";
import { FirestoreAvailabilityRepository } from "@/repositories/firestore/availability.repository";
import { FirestoreEmployeeRepository } from "@/repositories/firestore/employee.repository";
import { FirestoreEventRepository } from "@/repositories/firestore/event.repository";
import { FirestoreLocationRepository } from "@/repositories/firestore/location.repository";
import { FirestoreNotificationRepository } from "@/repositories/firestore/notification.repository";
import { FirestoreSettingsRepository } from "@/repositories/firestore/settings.repository";
import { FirestoreShiftRepository } from "@/repositories/firestore/shift.repository";
import { FirestoreInvitationRepository, FirestoreUserRepository } from "@/repositories/firestore/user.repository";
import { AssignmentService } from "./assignment.service";
import { AttendanceService, ClientLocationValidator } from "./attendance.service";
import { AuthService } from "./auth.service";
import { AvailabilityService } from "./availability.service";
import { EmployeeService } from "./employee.service";
import { EventService } from "./event.service";
import { NotificationService } from "./notification.service";
import { ReportService } from "./report.service";
import { SettingsService } from "./settings.service";
import { ShiftService } from "./shift.service";

const repos = {
  users: new FirestoreUserRepository(),
  invitations: new FirestoreInvitationRepository(),
  employees: new FirestoreEmployeeRepository(),
  locations: new FirestoreLocationRepository(),
  events: new FirestoreEventRepository(),
  shifts: new FirestoreShiftRepository(),
  assignments: new FirestoreAssignmentRepository(),
  availability: new FirestoreAvailabilityRepository(),
  attendance: new FirestoreAttendanceRepository(),
  notifications: new FirestoreNotificationRepository(),
  audit: new FirestoreAuditRepository(),
  settings: new FirestoreSettingsRepository(),
};

export const authService = new AuthService(repos.users, repos.invitations, repos.audit);
export const employeeService = new EmployeeService(
  repos.employees,
  repos.invitations,
  repos.users,
  repos.assignments,
  repos.attendance,
  repos.audit,
);
export const eventService = new EventService(repos.events, repos.shifts, repos.assignments, repos.locations, repos.audit);
export const shiftService = new ShiftService(repos.shifts, repos.events, repos.assignments, repos.audit);
export const availabilityService = new AvailabilityService(repos.availability, repos.audit);
export const assignmentService = new AssignmentService(
  repos.assignments,
  repos.shifts,
  repos.employees,
  repos.availability,
  repos.audit,
);
export const attendanceService = new AttendanceService(
  repos.attendance,
  repos.shifts,
  repos.events,
  repos.settings,
  repos.audit,
  new ClientLocationValidator(),
);
export const notificationService = new NotificationService(repos.notifications);
export const reportService = new ReportService(repos.attendance);
export const settingsService = new SettingsService(repos.settings, repos.users, repos.audit);
