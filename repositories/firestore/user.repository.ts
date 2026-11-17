import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { InvitationRepository, UserRepository } from "../contracts";
import { mapInvitation, mapUser } from "./mappers";
import type { Invitation } from "@/types";

export class FirestoreUserRepository implements UserRepository {
  async getById(uid: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.users, uid));
    return snap.exists() ? mapUser(snap.id, snap.data()) : null;
  }

  async list() {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.users), orderBy("displayName")));
    return snap.docs.map((d) => mapUser(d.id, d.data()));
  }

  async updateByAdmin(uid: string, patch: { role?: "admin" | "worker"; active?: boolean; displayName?: string; employeeId?: string | null }) {
    await updateDoc(doc(getDb(), COLLECTIONS.users, uid), { ...patch, updatedAt: serverTimestamp() });
  }

  async updateOwnDisplayName(uid: string, displayName: string) {
    await updateDoc(doc(getDb(), COLLECTIONS.users, uid), { displayName, updatedAt: serverTimestamp() });
  }
}

export class FirestoreInvitationRepository implements InvitationRepository {
  async getByEmail(emailLower: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.invitations, emailLower));
    return snap.exists() ? mapInvitation(snap.id, snap.data()) : null;
  }

  async listByEmployee(employeeId: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.invitations), where("employeeId", "==", employeeId)));
    return snap.docs.map((d) => mapInvitation(d.id, d.data()));
  }

  async create(input: { email: string; employeeId: string; displayName: string }, actor: { uid: string }) {
    const emailLower = input.email.toLowerCase();
    const batch = writeBatch(getDb());
    batch.set(doc(getDb(), COLLECTIONS.invitations, emailLower), {
      email: input.email,
      employeeId: input.employeeId,
      displayName: input.displayName,
      role: "worker",
      status: "pending",
      createdAt: serverTimestamp(),
      createdBy: actor.uid,
      acceptedBy: null,
      acceptedAt: null,
    });
    await batch.commit();
  }

  async revoke(emailLower: string) {
    await updateDoc(doc(getDb(), COLLECTIONS.invitations, emailLower), { status: "revoked" });
  }

  async accept(params: { uid: string; email: string; displayName: string; invitation: Invitation }) {
    const db = getDb();
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.users, params.uid), {
      email: params.email,
      displayName: params.displayName,
      role: "worker",
      employeeId: params.invitation.employeeId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: params.uid,
    });
    batch.update(doc(db, COLLECTIONS.employees, params.invitation.employeeId), {
      userId: params.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, COLLECTIONS.invitations, params.invitation.id), {
      status: "accepted",
      acceptedBy: params.uid,
      acceptedAt: serverTimestamp(),
    });
    await batch.commit();
  }
}
