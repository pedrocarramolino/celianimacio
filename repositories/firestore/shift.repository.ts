import { collection, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, NotificationDraft, ShiftInput, ShiftRepository } from "../contracts";
import { mapShift, mapShiftTeam, serializeLocationSnapshot, ts } from "./mappers";
import { addNotifications } from "./notification.repository";
import type { Assignment, CompanyEvent, Shift, ShiftStatus } from "@/types";

const serialize = (i: ShiftInput) => ({
  name: i.name.trim(),
  date: i.date,
  startAt: ts(i.startAt),
  endAt: ts(i.endAt),
  requiredWorkers: i.requiredWorkers,
  position: i.position.trim(),
  location: i.location ? serializeLocationSnapshot(i.location) : null,
  instructions: i.instructions,
});

export class FirestoreShiftRepository implements ShiftRepository {
  async getById(id: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.shifts, id));
    return snap.exists() ? mapShift(snap.id, snap.data()) : null;
  }

  async listByEvent(eventId: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.shifts), where("eventId", "==", eventId)));
    return snap.docs.map((d) => mapShift(d.id, d.data())).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  async listByDateRange(from: string, toInclusive: string) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.shifts),
        where("date", ">=", from),
        where("date", "<=", toInclusive),
        orderBy("date"),
      ),
    );
    return snap.docs.map((d) => mapShift(d.id, d.data())).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  async create(event: CompanyEvent, input: ShiftInput, status: ShiftStatus, actor: Actor) {
    const db = getDb();
    const ref = doc(collection(db, COLLECTIONS.shifts));
    const batch = writeBatch(db);
    batch.set(ref, {
      ...serialize(input),
      eventId: event.id,
      eventName: event.name,
      status,
      staffEmployeeIds: [],
      confirmedEmployeeIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actor.uid,
    });
    batch.update(doc(db, COLLECTIONS.events, event.id), { shiftCount: increment(1), updatedAt: serverTimestamp() });
    await batch.commit();
    return ref.id;
  }

  async update(
    shift: Shift,
    input: ShiftInput,
    status: ShiftStatus,
    activeAssignments: Assignment[],
    notifications: NotificationDraft[],
    actor: Actor,
  ) {
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.shifts, shift.id), { ...serialize(input), status, updatedAt: serverTimestamp() });
    for (const a of activeAssignments) {
      batch.update(doc(db, COLLECTIONS.assignments, a.id), {
        shiftName: input.name.trim(),
        shiftStartAt: ts(input.startAt),
        shiftEndAt: ts(input.endAt),
        updatedAt: serverTimestamp(),
      });
    }
    addNotifications(db, batch, notifications, actor);
    await batch.commit();
  }

  async cancel(params: {
    shift: Shift;
    event: CompanyEvent;
    activeAssignments: Assignment[];
    reason: string;
    nextEventStaffEmployeeIds: string[];
    notifications: NotificationDraft[];
  }, actor: Actor) {
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.shifts, params.shift.id), {
      status: "cancelled",
      staffEmployeeIds: [],
      confirmedEmployeeIds: [],
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, COLLECTIONS.shiftTeams, params.shift.id), {
      shiftId: params.shift.id,
      eventId: params.shift.eventId,
      memberEmployeeIds: [],
      members: [],
      updatedAt: serverTimestamp(),
    });
    for (const a of params.activeAssignments) {
      batch.update(doc(db, COLLECTIONS.assignments, a.id), {
        status: "cancelled",
        cancelledReason: params.reason.slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    }
    batch.update(doc(db, COLLECTIONS.events, params.event.id), {
      staffEmployeeIds: params.nextEventStaffEmployeeIds,
      updatedAt: serverTimestamp(),
    });
    addNotifications(db, batch, params.notifications, actor);
    await batch.commit();
  }

  async getTeam(shiftId: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.shiftTeams, shiftId));
    return snap.exists() ? mapShiftTeam(snap.id, snap.data()) : null;
  }
}
