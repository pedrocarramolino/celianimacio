import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, AuditRepository } from "../contracts";
import { mapAudit } from "./mappers";
import type { AuditEntity } from "@/types";

export class FirestoreAuditRepository implements AuditRepository {
  async log(entry: { action: string; entityType: AuditEntity; entityId: string; summary: string }, actor: Actor) {
    await addDoc(collection(getDb(), COLLECTIONS.auditLogs), {
      actorUid: actor.uid,
      action: entry.action.slice(0, 60),
      entityType: entry.entityType,
      entityId: entry.entityId.slice(0, 300),
      summary: entry.summary.slice(0, 500),
      at: serverTimestamp(),
    });
  }

  async listRecent(max = 50) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.auditLogs), orderBy("at", "desc"), limit(max)));
    return snap.docs.map((d) => mapAudit(d.id, d.data()));
  }
}
