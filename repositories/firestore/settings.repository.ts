import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { SettingsRepository } from "../contracts";
import { mapSettings } from "./mappers";
import type { CompanySettings } from "@/types";

export class FirestoreSettingsRepository implements SettingsRepository {
  async get() {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.settings, "company"));
    return mapSettings(snap.exists() ? snap.data() : undefined);
  }
  async save(value: Omit<CompanySettings, "updatedAt">) {
    await setDoc(doc(getDb(), COLLECTIONS.settings, "company"), { ...value, updatedAt: serverTimestamp() });
  }
}
