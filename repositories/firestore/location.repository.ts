import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, LocationInput, LocationRepository } from "../contracts";
import { mapLocation } from "./mappers";

const serialize = (i: LocationInput) => ({
  name: i.name.trim(),
  address: i.address.trim(),
  lat: i.lat,
  lng: i.lng,
  radiusMeters: i.radiusMeters,
  notes: i.notes,
});

export class FirestoreLocationRepository implements LocationRepository {
  async list() {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.locations), orderBy("name")));
    return snap.docs.map((d) => mapLocation(d.id, d.data()));
  }
  async create(input: LocationInput, actor: Actor) {
    const ref = await addDoc(collection(getDb(), COLLECTIONS.locations), {
      ...serialize(input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actor.uid,
    });
    return ref.id;
  }
  async update(id: string, input: LocationInput) {
    await updateDoc(doc(getDb(), COLLECTIONS.locations, id), { ...serialize(input), updatedAt: serverTimestamp() });
  }
  async remove(id: string) {
    await deleteDoc(doc(getDb(), COLLECTIONS.locations, id));
  }
}
