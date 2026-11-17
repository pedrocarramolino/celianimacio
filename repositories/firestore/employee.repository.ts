import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, EmployeeInput, EmployeeRepository } from "../contracts";
import { mapEmployee } from "./mappers";
import { employeeFullName } from "@/types";

function serialize(input: EmployeeInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    emailLower: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    position: input.position.trim(),
    hireDate: input.hireDate,
    status: input.status,
    photoURL: input.photoURL,
    notes: input.notes,
  };
}

export class FirestoreEmployeeRepository implements EmployeeRepository {
  async list() {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.employees), orderBy("firstName")));
    return snap.docs.map((d) => mapEmployee(d.id, d.data()));
  }

  async getById(id: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.employees, id));
    return snap.exists() ? mapEmployee(snap.id, snap.data()) : null;
  }

  async getByUserId(uid: string) {
    const snap = await getDocs(
      query(collection(getDb(), COLLECTIONS.employees), where("userId", "==", uid), limit(1)),
    );
    const d = snap.docs[0];
    return d ? mapEmployee(d.id, d.data()) : null;
  }

  async create(input: EmployeeInput, actor: Actor, options: { invite: boolean }) {
    const db = getDb();
    const ref = doc(collection(db, COLLECTIONS.employees));
    const data = serialize(input);
    const batch = writeBatch(db);
    batch.set(ref, {
      ...data,
      userId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actor.uid,
    });
    if (options.invite) {
      batch.set(doc(db, COLLECTIONS.invitations, data.emailLower), {
        email: data.email,
        employeeId: ref.id,
        displayName: employeeFullName(data),
        role: "worker",
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: actor.uid,
        acceptedBy: null,
        acceptedAt: null,
      });
    }
    await batch.commit();
    return ref.id;
  }

  async update(id: string, input: EmployeeInput) {
    await updateDoc(doc(getDb(), COLLECTIONS.employees, id), { ...serialize(input), updatedAt: serverTimestamp() });
  }

  async updateOwnPhone(id: string, phone: string) {
    await updateDoc(doc(getDb(), COLLECTIONS.employees, id), { phone: phone.trim(), updatedAt: serverTimestamp() });
  }
}
