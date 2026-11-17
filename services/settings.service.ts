import type { AuditRepository, SettingsRepository, UserRepository } from "@/repositories/contracts";
import type { AppUser, CompanySettings, UserRole } from "@/types";
import { settingsSchema, type SettingsFormValues } from "@/schemas/settings";
import { AppError } from "@/utils/errors";
import { requireActor, requireAdmin } from "./session";

export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditRepository,
  ) {}

  get(): Promise<CompanySettings> {
    requireActor();
    return this.repo.get();
  }

  async save(values: SettingsFormValues): Promise<void> {
    const actor = requireAdmin();
    const v = settingsSchema.parse(values);
    await this.repo.save({
      companyName: v.companyName,
      timezone: "Europe/Madrid",
      defaultRadiusMeters: Number(v.defaultRadiusMeters),
      maxAccuracyMeters: Number(v.maxAccuracyMeters),
      checkInEarlyMinutes: Number(v.checkInEarlyMinutes),
    });
    await this.audit.log({ action: "settings.saved", entityType: "settings", entityId: "company", summary: "" }, actor);
  }

  listUsers(): Promise<AppUser[]> {
    requireAdmin();
    return this.users.list();
  }

  /** Cambio de rol: solo administradores (lo impone firestore.rules). */
  async setRole(user: AppUser, role: UserRole): Promise<void> {
    const actor = requireAdmin();
    if (user.id === actor.uid && role !== "admin") {
      throw new AppError("No puedes retirarte a ti mismo el rol de administrador.");
    }
    await this.users.updateByAdmin(user.id, { role });
    await this.audit.log({ action: "user.role", entityType: "user", entityId: user.id, summary: `${user.email} → ${role}` }, actor);
  }

  async setActive(user: AppUser, active: boolean): Promise<void> {
    const actor = requireAdmin();
    if (user.id === actor.uid && !active) throw new AppError("No puedes desactivar tu propia cuenta.");
    await this.users.updateByAdmin(user.id, { active });
    await this.audit.log({ action: active ? "user.activated" : "user.deactivated", entityType: "user", entityId: user.id, summary: user.email }, actor);
  }

  recentAudit(max = 30) {
    requireAdmin();
    return this.auditRepo().listRecent(max);
  }

  private auditRepo() {
    return this.audit;
  }
}
