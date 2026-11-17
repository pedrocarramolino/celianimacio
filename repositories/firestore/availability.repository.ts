import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { availabilityId, COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, AvailabilityRepository } from "../contracts";
import { mapAvailability } from "./mappers";
import type { WeeklyAvailability } from "@/types";

export class FirestoreAvailabilityRepository implements AvailabilityRepository {
  async get(employeeId: string, weekStart: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.availability, availabilityId(employeeId, weekStart)));
    return snap.exists() ? mapAvailability(snap.id, snap.data()) : null;
  }

  async listByWeek(weekStart: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.availability), where("weekStart", "==", weekStart)));
    return snap.docs.map((d) => mapAvailability(d.id, d.data()));
  }

  async save(value: Omit<WeeklyAvailability, "id" | "updatedAt" | "updatedBy">, actor: Actor) {
    await setDoc(doc(getDb(), COLLECTIONS.availability, availabilityId(value.employeeId, value.weekStart)), {
      employeeId: value.employeeId,
      weekStart: value.weekStart,
      days: value.days.map((d) => ({
        date: d.date,
        status: d.status,
        slots: d.status === "partial" ? d.slots.map((s) => ({ start: s.start, end: s.end })) : [],
      })),
      note: value.note,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });
  }
}
