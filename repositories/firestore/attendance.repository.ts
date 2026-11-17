import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type FieldValue,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { attendanceSessionId, breakRecordId, COLLECTIONS } from "@/lib/firebase/collections";
import type { AttendanceRepository, CheckInWrite, NotificationDraft } from "../contracts";
import { mapBreak, mapSession, ts } from "./mappers";
import { addNotifications } from "./notification.repository";
import type { AttendanceIncident, AttendancePunch, AttendanceSession, BreakRecord } from "@/types";

function punchPayload(p: AttendancePunch) {
  return {
    clientAt: ts(p.clientAt),
    serverAt: serverTimestamp(),
    coords: p.coords ? { lat: p.coords.lat, lng: p.coords.lng } : null,
    accuracyMeters: p.accuracyMeters,
    distanceMeters: p.distanceMeters == null ? null : Math.round(p.distanceMeters),
    withinRadius: p.withinRadius,
    validation: "client" as const,
  };
}

function incidentPayload(i: AttendanceIncident) {
  return { type: i.type, stage: i.stage, message: i.message.slice(0, 300), at: Timestamp.fromDate(i.at) };
}

/** Campos de incidencias para una actualización: solo añade (arrayUnion) y mantiene el indicador. */
function incidentFields(session: AttendanceSession, incidents: AttendanceIncident[]): Record<string, FieldValue | boolean> {
  if (incidents.length === 0) return {};
  return { incidents: arrayUnion(...incidents.map(incidentPayload)), hasIncident: true };
}

function uid(session: AttendanceSession): { uid: string } {
  return { uid: session.userId };
}

export class FirestoreAttendanceRepository implements AttendanceRepository {
  async getSession(id: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.attendanceSessions, id));
    return snap.exists() ? mapSession(snap.id, snap.data()) : null;
  }

  async listSessionsByUser(userId: string, max = 100) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.attendanceSessions),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((d) => mapSession(d.id, d.data()));
  }

  async listSessionsByEmployee(employeeId: string) {
    const snap = await getDocs(
      query(collection(getDb(), COLLECTIONS.attendanceSessions), where("employeeId", "==", employeeId)),
    );
    return snap.docs
      .map((d) => mapSession(d.id, d.data()))
      .sort((a, b) => b.shiftStartAt.getTime() - a.shiftStartAt.getTime());
  }

  async listSessionsInRange(from: Date, to: Date) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.attendanceSessions),
        where("shiftStartAt", ">=", ts(from)),
        where("shiftStartAt", "<", ts(to)),
        orderBy("shiftStartAt"),
      ),
    );
    return snap.docs.map((d) => mapSession(d.id, d.data()));
  }

  async listOpenSessions() {
    const snap = await getDocs(
      query(collection(getDb(), COLLECTIONS.attendanceSessions), where("status", "in", ["open", "on_break"])),
    );
    return snap.docs.map((d) => mapSession(d.id, d.data()));
  }

  async listBreaks(session: Pick<AttendanceSession, "id" | "userId">) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.breakRecords),
        where("sessionId", "==", session.id),
        where("userId", "==", session.userId),
      ),
    );
    return snap.docs.map((d) => mapBreak(d.id, d.data())).sort((a, b) => a.index - b.index);
  }

  async checkIn(write: CheckInWrite) {
    const db = getDb();
    const s = write.session;
    const id = attendanceSessionId(s.shiftId, s.employeeId);
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.attendanceSessions, id), {
      shiftId: s.shiftId,
      eventId: s.eventId,
      employeeId: s.employeeId,
      userId: s.userId,
      employeeName: s.employeeName,
      eventName: s.eventName,
      shiftName: s.shiftName,
      shiftStartAt: ts(s.shiftStartAt),
      shiftEndAt: ts(s.shiftEndAt),
      status: "open",
      checkIn: punchPayload(s.checkIn),
      checkOut: null,
      breakCount: 0,
      totalBreakMinutes: 0,
      workedMinutes: null,
      incidents: s.incidents.map(incidentPayload),
      hasIncident: s.incidents.length > 0,
      adminNote: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (write.notification) addNotifications(db, batch, [write.notification], { uid: s.userId });
    await batch.commit();
    return id;
  }

  async startBreak(session: AttendanceSession, punch: AttendancePunch, incidents: AttendanceIncident[], notification: NotificationDraft | null) {
    const db = getDb();
    const index = session.breakCount + 1;
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.breakRecords, breakRecordId(session.id, index)), {
      sessionId: session.id,
      employeeId: session.employeeId,
      userId: session.userId,
      index,
      start: punchPayload(punch),
      end: null,
      durationMinutes: null,
    });
    batch.update(doc(db, COLLECTIONS.attendanceSessions, session.id), {
      status: "on_break",
      breakCount: index,
      ...incidentFields(session, incidents),
      updatedAt: serverTimestamp(),
    });
    if (notification) addNotifications(db, batch, [notification], uid(session));
    await batch.commit();
  }

  async endBreak(
    session: AttendanceSession,
    openBreak: BreakRecord,
    punch: AttendancePunch,
    durationMinutes: number,
    incidents: AttendanceIncident[],
    notification: NotificationDraft | null,
  ) {
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.breakRecords, openBreak.id), {
      end: punchPayload(punch),
      durationMinutes,
    });
    batch.update(doc(db, COLLECTIONS.attendanceSessions, session.id), {
      status: "open",
      totalBreakMinutes: session.totalBreakMinutes + durationMinutes,
      ...incidentFields(session, incidents),
      updatedAt: serverTimestamp(),
    });
    if (notification) addNotifications(db, batch, [notification], uid(session));
    await batch.commit();
  }

  async checkOut(
    session: AttendanceSession,
    punch: AttendancePunch,
    workedMinutes: number,
    incidents: AttendanceIncident[],
    notification: NotificationDraft | null,
  ) {
    const db = getDb();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.attendanceSessions, session.id), {
      status: "closed",
      checkOut: punchPayload(punch),
      workedMinutes,
      ...incidentFields(session, incidents),
      updatedAt: serverTimestamp(),
    });
    if (notification) addNotifications(db, batch, [notification], uid(session));
    await batch.commit();
  }

  async adminClose(
    session: AttendanceSession,
    params: { checkOutAt: Date; workedMinutes: number; note: string; incidents: AttendanceIncident[] },
  ) {
    const db = getDb();
    const batch = writeBatch(db);
    if (session.status === "on_break") {
      const openBreak = (await this.listBreaks(session)).find((b) => b.end == null);
      if (openBreak) {
        batch.update(doc(db, COLLECTIONS.breakRecords, openBreak.id), {
          end: {
            clientAt: ts(params.checkOutAt),
            serverAt: serverTimestamp(),
            coords: null,
            accuracyMeters: null,
            distanceMeters: null,
            withinRadius: null,
            validation: "client",
          },
          durationMinutes: 0,
        });
      }
    }
    batch.update(doc(db, COLLECTIONS.attendanceSessions, session.id), {
      status: "closed",
      checkOut: {
        clientAt: ts(params.checkOutAt),
        serverAt: serverTimestamp(),
        coords: null,
        accuracyMeters: null,
        distanceMeters: null,
        withinRadius: null,
        validation: "client",
      },
      workedMinutes: params.workedMinutes,
      adminNote: params.note.slice(0, 1000),
      ...incidentFields(session, params.incidents),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }
}
