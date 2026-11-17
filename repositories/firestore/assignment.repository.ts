import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { assignmentId, COLLECTIONS } from "@/lib/firebase/collections";
import type { Actor, AssignmentMutation, AssignmentRepository } from "../contracts";
import { mapAssignment, mapEvent, mapShift, mapShiftTeam, ts } from "./mappers";
import { notificationPayload } from "./notification.repository";
import { computeShiftStatus, projectEventStaff, projectShiftMembership } from "@/services/domain/assignment-rules";
import { AppError } from "@/utils/errors";

export class FirestoreAssignmentRepository implements AssignmentRepository {
  async getById(id: string) {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.assignments, id));
    return snap.exists() ? mapAssignment(snap.id, snap.data()) : null;
  }

  async listByShift(shiftId: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.assignments), where("shiftId", "==", shiftId)));
    return snap.docs.map((d) => mapAssignment(d.id, d.data()));
  }

  async listByEvent(eventId: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.assignments), where("eventId", "==", eventId)));
    return snap.docs.map((d) => mapAssignment(d.id, d.data()));
  }

  async listByEmployee(employeeId: string) {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.assignments), where("employeeId", "==", employeeId)));
    return snap.docs
      .map((d) => mapAssignment(d.id, d.data()))
      .sort((a, b) => b.shiftStartAt.getTime() - a.shiftStartAt.getTime());
  }

  async listByEmployeeEndingAfter(employeeId: string, after: Date) {
    const snap = await getDocs(
      query(collection(getDb(), COLLECTIONS.assignments), where("employeeId", "==", employeeId)),
    );
    // Filtro por fecha en cliente: evita depender de un índice compuesto (employeeId + shiftEndAt).
    return snap.docs.map((d) => mapAssignment(d.id, d.data())).filter((a) => a.shiftEndAt.getTime() > after.getTime());
  }

  async listInRange(from: Date, to: Date) {
    const snap = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.assignments),
        where("shiftStartAt", ">=", ts(from)),
        where("shiftStartAt", "<", ts(to)),
      ),
    );
    return snap.docs.map((d) => mapAssignment(d.id, d.data()));
  }

  /**
   * Transacción cliente (disponible en Spark). Lee el estado actual del turno, del evento y
   * del equipo para que dos administradores simultáneos no sobrescriban sus cambios.
   * NOTA: la comprobación de solapes se hace antes, fuera de la transacción, porque las
   * transacciones web no admiten consultas. Ver docs/LIMITACIONES.md.
   */
  async applyMutation(m: AssignmentMutation, actor: Actor) {
    const db = getDb();
    const id = assignmentId(m.shiftId, m.employeeId);
    await runTransaction(db, async (tx) => {
      const shiftRef = doc(db, COLLECTIONS.shifts, m.shiftId);
      const assignmentRef = doc(db, COLLECTIONS.assignments, id);
      const teamRef = doc(db, COLLECTIONS.shiftTeams, m.shiftId);

      const shiftSnap = await tx.get(shiftRef);
      if (!shiftSnap.exists()) throw new AppError("El turno no existe.");
      const shift = mapShift(shiftSnap.id, shiftSnap.data());
      if (shift.status === "cancelled") throw new AppError("El turno está cancelado.");

      const eventRef = doc(db, COLLECTIONS.events, shift.eventId);
      const [assignmentSnap, eventSnap, teamSnap] = await Promise.all([
        tx.get(assignmentRef),
        tx.get(eventRef),
        tx.get(teamRef),
      ]);
      if (!eventSnap.exists()) throw new AppError("El evento no existe.");
      const event = mapEvent(eventSnap.id, eventSnap.data());
      if (event.status === "cancelled") throw new AppError("El evento está cancelado.");

      const membership = projectShiftMembership(shift, m.employeeId, m.nextStatus);
      if (m.nextStatus === "confirmed" && membership.confirmedEmployeeIds.length > shift.requiredWorkers) {
        throw new AppError(
          `El turno ya tiene ${shift.requiredWorkers} trabajador(es) confirmados. Aumenta las plazas para confirmar más.`,
        );
      }
      const nextShiftStatus = computeShiftStatus(shift.status, membership.confirmedEmployeeIds.length, shift.requiredWorkers);

      if (assignmentSnap.exists()) {
        tx.update(assignmentRef, {
          status: m.nextStatus,
          cancelledReason: m.nextStatus === "cancelled" ? m.cancelledReason.slice(0, 500) : "",
          employeeName: m.employeeName,
          eventName: shift.eventName,
          shiftName: shift.name,
          shiftStartAt: ts(shift.startAt),
          shiftEndAt: ts(shift.endAt),
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(assignmentRef, {
          shiftId: shift.id,
          eventId: shift.eventId,
          employeeId: m.employeeId,
          employeeName: m.employeeName,
          eventName: shift.eventName,
          shiftName: shift.name,
          shiftStartAt: ts(shift.startAt),
          shiftEndAt: ts(shift.endAt),
          status: m.nextStatus,
          cancelledReason: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: actor.uid,
        });
      }

      tx.update(shiftRef, {
        staffEmployeeIds: membership.staffEmployeeIds,
        confirmedEmployeeIds: membership.confirmedEmployeeIds,
        status: nextShiftStatus,
        updatedAt: serverTimestamp(),
      });

      tx.update(eventRef, {
        staffEmployeeIds: projectEventStaff(event.staffEmployeeIds, m.employeeId, m.nextStatus, m.employeeHasOtherShiftsInEvent),
        updatedAt: serverTimestamp(),
      });

      const team = teamSnap.exists() ? mapShiftTeam(teamSnap.id, teamSnap.data()) : null;
      const members = (team?.members ?? []).filter((x) => x.employeeId !== m.employeeId);
      if (m.nextStatus === "confirmed") {
        members.push({ employeeId: m.employeeId, displayName: m.employeeName, position: m.employeePosition });
      }
      members.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
      tx.set(teamRef, {
        shiftId: shift.id,
        eventId: shift.eventId,
        memberEmployeeIds: members.map((x) => x.employeeId),
        members,
        updatedAt: serverTimestamp(),
      });

      if (m.notification) {
        tx.set(doc(collection(db, COLLECTIONS.notifications)), notificationPayload(m.notification, actor));
      }
    });
  }
}
