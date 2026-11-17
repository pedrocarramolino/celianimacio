import type { AssignmentRepository, AttendanceRepository, AuditRepository, EmployeeInput, EmployeeRepository, InvitationRepository, UserRepository } from "@/repositories/contracts";
import type { AppUser, Assignment, AttendanceSession, Employee, Invitation } from "@/types";
import { employeeFullName } from "@/types";
import { employeeSchema, type EmployeeFormValues } from "@/schemas/employee";
import { AppError } from "@/utils/errors";
import { requireActor, requireAdmin, requireEmployeeId } from "./session";

export function employeeFormToInput(values: EmployeeFormValues): EmployeeInput {
  const v = employeeSchema.parse(values);
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    phone: v.phone,
    position: v.position,
    hireDate: v.hireDate === "" ? null : v.hireDate,
    status: v.status,
    photoURL: v.photoURL === "" ? null : v.photoURL,
    notes: v.notes,
  };
}

export function employeeToForm(e: Employee): EmployeeFormValues {
  return {
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phone: e.phone,
    position: e.position,
    hireDate: e.hireDate ?? "",
    status: e.status,
    photoURL: e.photoURL ?? "",
    notes: e.notes,
  };
}

export class EmployeeService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly invitations: InvitationRepository,
    private readonly users: UserRepository,
    private readonly assignments: AssignmentRepository,
    private readonly attendance: AttendanceRepository,
    private readonly audit: AuditRepository,
  ) {}

  list(): Promise<Employee[]> {
    requireAdmin();
    return this.employees.list();
  }

  async listActive(): Promise<Employee[]> {
    return (await this.list()).filter((e) => e.status === "active");
  }

  async get(id: string): Promise<Employee> {
    requireAdmin();
    const e = await this.employees.getById(id);
    if (!e) throw new AppError("Trabajador no encontrado.", "not-found");
    return e;
  }

  async create(values: EmployeeFormValues, options: { invite: boolean }): Promise<string> {
    const actor = requireAdmin();
    const input = employeeFormToInput(values);
    const existing = (await this.employees.list()).find((e) => e.emailLower === input.email.toLowerCase());
    if (existing) throw new AppError("Ya existe un trabajador con ese correo electrónico.");
    if (options.invite) {
      const inv = await this.invitations.getByEmail(input.email.toLowerCase());
      if (inv && inv.status !== "revoked") throw new AppError("Ya existe una invitación para ese correo.");
    }
    const id = await this.employees.create(input, actor, options);
    await this.audit.log({ action: "employee.created", entityType: "employee", entityId: id, summary: employeeFullName(input) }, actor);
    return id;
  }

  async update(id: string, values: EmployeeFormValues): Promise<void> {
    const actor = requireAdmin();
    const current = await this.get(id);
    const input = employeeFormToInput(values);
    if (current.userId && input.email.toLowerCase() !== current.emailLower) {
      throw new AppError("No se puede cambiar el correo de un trabajador con cuenta activada (debe coincidir con su acceso).");
    }
    await this.employees.update(id, input);
    await this.audit.log({ action: "employee.updated", entityType: "employee", entityId: id, summary: employeeFullName(input) }, actor);
  }

  async setStatus(employee: Employee, status: "active" | "inactive"): Promise<void> {
    const actor = requireAdmin();
    await this.employees.update(employee.id, { ...employeeFormToInput(employeeToForm(employee)), status });
    if (employee.userId) {
      await this.users.updateByAdmin(employee.userId, { active: status === "active" });
    }
    await this.audit.log({ action: `employee.${status}`, entityType: "employee", entityId: employee.id, summary: employeeFullName(employee) }, actor);
  }

  async invite(employee: Employee): Promise<void> {
    const actor = requireAdmin();
    if (employee.userId) throw new AppError("Este trabajador ya tiene la cuenta activada.");
    const existing = await this.invitations.getByEmail(employee.emailLower);
    if (existing && existing.status === "pending") throw new AppError("Ya hay una invitación pendiente.");
    if (existing && existing.status === "accepted") throw new AppError("La invitación de este correo ya fue aceptada.");
    await this.invitations.create({ email: employee.email, employeeId: employee.id, displayName: employeeFullName(employee) }, actor);
    await this.audit.log({ action: "invitation.created", entityType: "invitation", entityId: employee.emailLower, summary: employee.email }, actor);
  }

  async revokeInvitation(invitation: Invitation): Promise<void> {
    const actor = requireAdmin();
    await this.invitations.revoke(invitation.id);
    await this.audit.log({ action: "invitation.revoked", entityType: "invitation", entityId: invitation.id, summary: invitation.email }, actor);
  }

  async invitationsFor(employeeId: string): Promise<Invitation[]> {
    requireAdmin();
    return this.invitations.listByEmployee(employeeId);
  }

  async linkedUser(employee: Employee): Promise<AppUser | null> {
    requireAdmin();
    return employee.userId ? this.users.getById(employee.userId) : null;
  }

  async history(employeeId: string): Promise<{ assignments: Assignment[]; sessions: AttendanceSession[] }> {
    requireAdmin();
    const [assignments, sessions] = await Promise.all([
      this.assignments.listByEmployee(employeeId),
      this.attendance.listSessionsByEmployee(employeeId),
    ]);
    return { assignments, sessions };
  }

  // ---- Portal del trabajador
  async getMine(): Promise<Employee | null> {
    const actor = requireActor();
    return this.employees.getByUserId(actor.uid);
  }

  async updateMyProfile(values: { phone: string; displayName: string }): Promise<void> {
    const actor = requireActor();
    const employeeId = requireEmployeeId();
    await this.employees.updateOwnPhone(employeeId, values.phone);
    await this.users.updateOwnDisplayName(actor.uid, values.displayName.trim());
  }
}
