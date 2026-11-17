import type { AssignmentRepository, AuditRepository, EventInput, EventRepository, LocationInput, LocationRepository, ShiftRepository } from "@/repositories/contracts";
import type { CompanyEvent, Location, LocationSnapshot } from "@/types";
import { eventSchema, type EventFormValues } from "@/schemas/event";
import { locationSchema, type LocationFormValues } from "@/schemas/location";
import { parseNumber } from "@/schemas/common";
import { AppError } from "@/utils/errors";
import { isActiveAssignment } from "./domain/assignment-rules";
import { notificationTemplates } from "./notification.service";
import { requireAdmin } from "./session";
import { todayISO } from "@/utils/dates";

export function snapshotFromForm(v: {
  locationId?: string;
  locationName: string;
  address: string;
  lat: string;
  lng: string;
  radiusMeters: string;
}): LocationSnapshot {
  return {
    locationId: v.locationId ? v.locationId : null,
    name: v.locationName.trim(),
    address: v.address.trim(),
    lat: parseNumber(v.lat),
    lng: parseNumber(v.lng),
    radiusMeters: Math.round(parseNumber(v.radiusMeters)),
  };
}

export function eventToForm(e: CompanyEvent): EventFormValues {
  return {
    name: e.name,
    description: e.description,
    date: e.date,
    status: e.status === "cancelled" ? "scheduled" : e.status,
    category: e.category,
    instructions: e.instructions,
    locationId: e.location.locationId ?? "",
    locationName: e.location.name,
    address: e.location.address,
    lat: String(e.location.lat),
    lng: String(e.location.lng),
    radiusMeters: String(e.location.radiusMeters),
  };
}

function formToInput(values: EventFormValues): EventInput {
  const v = eventSchema.parse(values);
  return {
    name: v.name,
    description: v.description,
    date: v.date,
    status: v.status,
    category: v.category,
    instructions: v.instructions,
    location: snapshotFromForm(v),
  };
}

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly shifts: ShiftRepository,
    private readonly assignments: AssignmentRepository,
    private readonly locations: LocationRepository,
    private readonly audit: AuditRepository,
  ) {}

  list(): Promise<CompanyEvent[]> {
    requireAdmin();
    return this.events.list();
  }

  upcoming(max = 10): Promise<CompanyEvent[]> {
    requireAdmin();
    return this.events.listFrom(todayISO(), max);
  }

  async get(id: string): Promise<CompanyEvent> {
    const e = await this.events.getById(id);
    if (!e) throw new AppError("Evento no encontrado.", "not-found");
    return e;
  }

  async create(values: EventFormValues): Promise<string> {
    const actor = requireAdmin();
    const input = formToInput(values);
    const id = await this.events.create(input, actor);
    await this.audit.log({ action: "event.created", entityType: "event", entityId: id, summary: input.name }, actor);
    return id;
  }

  async update(id: string, values: EventFormValues): Promise<void> {
    const actor = requireAdmin();
    const current = await this.get(id);
    if (current.status === "cancelled") throw new AppError("No se puede editar un evento cancelado.");
    const input = formToInput(values);
    let rename: { shiftIds: string[]; assignmentIds: string[] } | undefined;
    if (input.name !== current.name) {
      const [shifts, assignments] = await Promise.all([this.shifts.listByEvent(id), this.assignments.listByEvent(id)]);
      rename = { shiftIds: shifts.map((s) => s.id), assignmentIds: assignments.map((a) => a.id) };
    }
    await this.events.update(id, input, rename);
    await this.audit.log({ action: "event.updated", entityType: "event", entityId: id, summary: input.name }, actor);
  }

  async cancel(id: string, reason: string): Promise<void> {
    const actor = requireAdmin();
    const event = await this.get(id);
    if (event.status === "cancelled") throw new AppError("El evento ya está cancelado.");
    const [shifts, assignments] = await Promise.all([this.shifts.listByEvent(id), this.assignments.listByEvent(id)]);
    const active = assignments.filter(isActiveAssignment);
    const staff = [...new Set(active.map((a) => a.employeeId))];
    const notifications = staff.map((employeeId) => notificationTemplates.eventCancelled(employeeId, event.name, reason));
    await this.events.cancelCascade({ event, shifts, activeAssignments: active, reason, notifications }, actor);
    await this.audit.log({ action: "event.cancelled", entityType: "event", entityId: id, summary: `${event.name}. ${reason}` }, actor);
  }

  // ---- Ubicaciones reutilizables
  listLocations(): Promise<Location[]> {
    requireAdmin();
    return this.locations.list();
  }

  async saveLocation(id: string | null, values: LocationFormValues): Promise<void> {
    const actor = requireAdmin();
    const v = locationSchema.parse(values);
    const input: LocationInput = {
      name: v.locationName,
      address: v.address,
      lat: parseNumber(v.lat),
      lng: parseNumber(v.lng),
      radiusMeters: Math.round(parseNumber(v.radiusMeters)),
      notes: v.notes,
    };
    if (id) await this.locations.update(id, input);
    else id = await this.locations.create(input, actor);
    await this.audit.log({ action: "location.saved", entityType: "location", entityId: id, summary: input.name }, actor);
  }

  async removeLocation(id: string): Promise<void> {
    const actor = requireAdmin();
    await this.locations.remove(id);
    await this.audit.log({ action: "location.removed", entityType: "location", entityId: id, summary: "" }, actor);
  }
}
