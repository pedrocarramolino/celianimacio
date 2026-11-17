import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
  type Transaction,
  type Firestore,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, NotificationDraft, NotificationRepository } from "../contracts";
import { mapNotification } from "./mappers";

export function notificationPayload(draft: NotificationDraft, actor: Actor) {
  return {
    type: draft.type,
    title: draft.title.slice(0, 160),
    body: draft.body.slice(0, 2000),
    link: draft.link,
    recipientEmployeeId: draft.recipientEmployeeId,
    recipientRole: draft.recipientRole,
    read: false,
    readAt: null,
    createdAt: serverTimestamp(),
    createdBy: actor.uid,
  };
}

/** Añade notificaciones a un lote o transacción existente (mismo commit atómico). */
export function addNotifications(db: Firestore, target: WriteBatch | Transaction, drafts: NotificationDraft[], actor: Actor) {
  for (const draft of drafts) {
    const ref = doc(collection(db, COLLECTIONS.notifications));
    (target as WriteBatch).set(ref, notificationPayload(draft, actor));
  }
}

export class FirestoreNotificationRepository implements NotificationRepository {
  async listForEmployee(employeeId: string, max = 50) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.notifications),
        where("recipientEmployeeId", "==", employeeId),
        orderBy("createdAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => mapNotification(d.id, d.data()));
  }

  async listForAdmins(max = 50) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.notifications),
        where("recipientRole", "==", "admin"),
        orderBy("createdAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => mapNotification(d.id, d.data()));
  }

  async createMany(drafts: NotificationDraft[], actor: Actor) {
    const db = getDb();
    for (let i = 0; i < drafts.length; i += 400) {
      const batch = writeBatch(db);
      addNotifications(db, batch, drafts.slice(i, i + 400), actor);
      await batch.commit();
    }
  }

  async markRead(id: string) {
    await updateDoc(doc(getDb(), COLLECTIONS.notifications, id), { read: true, readAt: serverTimestamp() });
  }

  async remove(id: string) {
    await deleteDoc(doc(getDb(), COLLECTIONS.notifications, id));
  }
}
