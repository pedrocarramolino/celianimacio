import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, EventInput, EventRepository, NotificationDraft } from "../contracts";
import { mapEvent, serializeLocationSnapshot } from "./mappers";
import { addNotifications } from "./notification.repository";
import type { Assignment, CompanyEvent, Shift } from "@/types";
import { AppError } from "@/utils/errors";

const serialize = (i: EventInput) => ({
  name: i.name.trim(),
  description: i.description,
  date: i.date,
  location: serializeLocationSnapshot(i.location),
  instructions: i.instructions,
  status: i.status,
  category: i.category,
});

export class FirestoreEventRepository implements EventRepository {
  async list() {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.events), orderBy("date", "desc")));
    return snap.docs.map((d) => mapEvent(d.id, d.data()));
  }

  async listFrom(fromDate: string, max = 50) {
    const snap = await getDocs(
      query(collection(getDb(), COLLECTIONS.events), where("date", ">=", fromDate), orderBy("date"), limit(max)),
    );
    return snap.docs.map((d) => mapEvent(d.id, d.data()));
  }

  async getById(id: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.events, id));
    return snap.exists() ? mapEvent(snap.id, snap.data()) : null;
  }

  async create(input: EventInput, actor: Actor) {
    const ref = await addDoc(collection(getDb(), COLLECTIONS.events), {
      ...serialize(input),
      staffEmployeeIds: [],
      shiftCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actor.uid,
    });
    return ref.id;
  }

  async update(id: string, input: EventInput, rename?: { shiftIds: string[]; assignmentIds: string[] }) {
    if (!rename || rename.shiftIds.length + rename.assignmentIds.length === 0) {
      await updateDoc(doc(getDb(), COLLECTIONS.events, id), { ...serialize(input), updatedAt: serverTimestamp() });
      return;
    }
    if (rename.shiftIds.length + rename.assignmentIds.length > 480) {
      throw new AppError("Demasiados turnos/asignaciones para renombrar el evento en una sola operación.");
    }
    const db = getDb();
    const batch = writeBatch(db);
    const name = input.name.trim();
    batch.update(doc(db, COLLECTIONS.events, id), { ...serialize(input), updatedAt: serverTimestamp() });
    for (const s of rename.shiftIds) batch.update(doc(db, COLLECTIONS.shifts, s), { eventName: name, updatedAt: serverTimestamp() });
    for (const a of rename.assignmentIds) batch.update(doc(db, COLLECTIONS.assignments, a), { eventName: name, updatedAt: serverTimestamp() });
    await batch.commit();
  }

  async cancelCascade(
    params: { event: CompanyEvent; shifts: Shift[]; activeAssignments: Assignment[]; reason: string; notifications: NotificationDraft[] },
    actor: Actor,
  ) {
    const ops = 1 + params.shifts.length * 2 + params.activeAssignments.length + params.notifications.length;
    if (ops > 480) {
      throw new AppError("El evento tiene demasiados elementos para cancelarlo en una sola operación. Cancela primero algunos turnos.");
    }
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.events, params.event.id), {
      status: "cancelled",
      staffEmployeeIds: [],
      updatedAt: serverTimestamp(),
    });
    for (const s of params.shifts) {
      batch.update(doc(db, COLLECTIONS.shifts, s.id), {
        status: "cancelled",
        staffEmployeeIds: [],
        confirmedEmployeeIds: [],
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, COLLECTIONS.shiftTeams, s.id), {
        shiftId: s.id,
        eventId: s.eventId,
        memberEmployeeIds: [],
        members: [],
        updatedAt: serverTimestamp(),
      });
    }
    for (const a of params.activeAssignments) {
      batch.update(doc(db, COLLECTIONS.assignments, a.id), {
        status: "cancelled",
        cancelledReason: params.reason.slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    }
    addNotifications(db, batch, params.notifications, actor);
    await batch.commit();
  }
}
