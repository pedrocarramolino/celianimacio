import type { AuditRepository, AvailabilityRepository } from "@/repositories/contracts";
import type { DayAvailability, WeeklyAvailability } from "@/types";
import { weekAvailabilitySchema } from "@/schemas/availability";
import { AppError } from "@/utils/errors";
import { emptyWeek, validateSlots } from "./domain/availability-rules";
import { requireActor, requireAdmin, requireEmployeeId } from "./session";
import { weekStartISO } from "@/utils/dates";

export class AvailabilityService {
  constructor(
    private readonly repo: AvailabilityRepository,
    private readonly audit: AuditRepository,
  ) {}

  async getMine(weekStart: string): Promise<WeeklyAvailability | null> {
    return this.repo.get(requireEmployeeId(), weekStart);
  }

  async saveMine(weekStart: string, days: DayAvailability[], note: string): Promise<void> {
    const employeeId = requireEmployeeId();
    await this.save(employeeId, weekStart, days, note);
  }

  /** El administrador también puede registrar la disponibilidad comunicada por un trabajador. */
  async saveFor(employeeId: string, weekStart: string, days: DayAvailability[], note: string): Promise<void> {
    requireAdmin();
    await this.save(employeeId, weekStart, days, note);
  }

  listWeek(weekStart: string): Promise<WeeklyAvailability[]> {
    requireAdmin();
    return this.repo.listByWeek(weekStart);
  }

  getFor(employeeId: string, weekStart: string): Promise<WeeklyAvailability | null> {
    requireAdmin();
    return this.repo.get(employeeId, weekStart);
  }

  emptyWeek(weekStart: string): DayAvailability[] {
    return emptyWeek(weekStart);
  }

  private async save(employeeId: string, weekStart: string, days: DayAvailability[], note: string) {
    const actor = requireActor();
    if (weekStartISO(weekStart) !== weekStart) throw new AppError("La semana debe empezar en lunes.");
    const parsed = weekAvailabilitySchema.safeParse({ weekStart, days, note });
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Datos de disponibilidad no válidos.");
    days.forEach((d, i) => {
      if (d.date !== emptyWeek(weekStart)[i]!.date) throw new AppError("Las fechas de la semana no son coherentes.");
      const err = validateSlots(d);
      if (err) throw new AppError(`${d.date}: ${err}`);
    });
    await this.repo.save({ employeeId, weekStart, days: parsed.data.days, note: parsed.data.note }, actor);
    await this.audit
      .log({ action: "availability.saved", entityType: "availability", entityId: `${employeeId}_${weekStart}`, summary: "" }, actor)
      .catch(() => undefined);
  }
}
