/**
 * Pruebas de las reglas de seguridad con el emulador de Firestore.
 * Ejecutar: npm run test:rules   (requiere Java; descarga el emulador la primera vez)
 */
import { after, before, beforeEach, describe, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

let env: RulesTestEnvironment;

const ADMIN = "admin1";
const WORKER = "worker1";
const OTHER = "worker2";
const now = Date.now();
const ts = (ms: number) => Timestamp.fromMillis(ms);

const loc = { locationId: null, name: "Sala", address: "C/ Mayor 1", lat: 41.38, lng: 2.17, radiusMeters: 150 };

function adminCtx() {
  return env.authenticatedContext(ADMIN, { email: "admin@example.com", email_verified: true }).firestore();
}
function workerCtx(uid = WORKER, email = "ana@example.com") {
  return env.authenticatedContext(uid, { email, email_verified: true }).firestore();
}

const punch = () => ({
  clientAt: Timestamp.now(),
  serverAt: serverTimestamp(),
  coords: { lat: 41.38, lng: 2.17 },
  accuracyMeters: 12,
  distanceMeters: 5,
  withinRadius: true,
  validation: "client",
});

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const meta = { createdAt: ts(now), updatedAt: ts(now), createdBy: ADMIN };
    await setDoc(doc(db, "users", ADMIN), { email: "admin@example.com", displayName: "Admin", role: "admin", employeeId: null, active: true, ...meta });
    await setDoc(doc(db, "users", WORKER), { email: "ana@example.com", displayName: "Ana", role: "worker", employeeId: "empA", active: true, ...meta });
    await setDoc(doc(db, "users", OTHER), { email: "bru@example.com", displayName: "Bru", role: "worker", employeeId: "empB", active: true, ...meta });
    const emp = (first: string, email: string, userId: string | null) => ({
      firstName: first, lastName: "Test", email, emailLower: email, phone: "600000000", position: "Animación",
      hireDate: "2025-01-01", status: "active", photoURL: null, userId, notes: "privado", ...meta,
    });
    await setDoc(doc(db, "employees", "empA"), emp("Ana", "ana@example.com", WORKER));
    await setDoc(doc(db, "employees", "empB"), emp("Bru", "bru@example.com", OTHER));
    await setDoc(doc(db, "employees", "empC"), emp("Cris", "cris@example.com", null));
    await setDoc(doc(db, "invitations", "cris@example.com"), {
      email: "cris@example.com", employeeId: "empC", displayName: "Cris Test", role: "worker", status: "pending",
      createdAt: ts(now), createdBy: ADMIN, acceptedBy: null, acceptedAt: null,
    });
    await setDoc(doc(db, "events", "ev1"), {
      name: "Boda", description: "", date: "2026-05-01", location: loc, instructions: "", status: "scheduled",
      staffEmployeeIds: ["empA"], shiftCount: 2, ...meta,
    });
    const shift = (staff: string[]) => ({
      eventId: "ev1", eventName: "Boda", name: "Montaje", date: "2026-05-01", startAt: ts(now - 30 * 60000), endAt: ts(now + 3 * 3600000),
      requiredWorkers: 2, position: "", location: null, instructions: "", status: "partially_filled",
      staffEmployeeIds: staff, confirmedEmployeeIds: staff, ...meta,
    });
    await setDoc(doc(db, "shifts", "sh1"), shift(["empA"]));
    await setDoc(doc(db, "shifts", "sh2"), shift(["empB"]));
    await setDoc(doc(db, "shiftTeams", "sh1"), { shiftId: "sh1", eventId: "ev1", memberEmployeeIds: ["empA"], members: [{ employeeId: "empA", displayName: "Ana Test", position: "" }], updatedAt: ts(now) });
    await setDoc(doc(db, "shiftTeams", "sh2"), { shiftId: "sh2", eventId: "ev1", memberEmployeeIds: ["empB"], members: [{ employeeId: "empB", displayName: "Bru Test", position: "" }], updatedAt: ts(now) });
    const asg = (shiftId: string, employeeId: string, status: string) => ({
      shiftId, eventId: "ev1", employeeId, employeeName: employeeId === "empA" ? "Ana Test" : "Bru Test", eventName: "Boda", shiftName: "Montaje",
      shiftStartAt: ts(now - 30 * 60000), shiftEndAt: ts(now + 3 * 3600000), status, cancelledReason: "", ...meta,
    });
    await setDoc(doc(db, "assignments", "sh1_empA"), asg("sh1", "empA", "confirmed"));
    await setDoc(doc(db, "assignments", "sh2_empB"), asg("sh2", "empB", "pending"));
    await setDoc(doc(db, "notifications", "n1"), {
      type: "general", title: "Hola", body: "", link: null, recipientEmployeeId: "empA", recipientRole: null, read: false, readAt: null, createdAt: ts(now), createdBy: ADMIN,
    });
  });
}

function sessionDoc(employeeId = "empA", userId = WORKER) {
  return {
    shiftId: "sh1", eventId: "ev1", employeeId, userId, employeeName: "Ana Test", eventName: "Boda", shiftName: "Montaje",
    shiftStartAt: ts(now - 30 * 60000), shiftEndAt: ts(now + 3 * 3600000), status: "open", checkIn: punch(), checkOut: null,
    breakCount: 0, totalBreakMinutes: 0, workedMinutes: null, incidents: [], hasIncident: false, adminNote: "",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-celianimacio",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

describe("acceso básico", () => {
  test("sin sesión no se puede leer nada", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "events", "ev1")));
    await assertFails(getDoc(doc(db, "settings", "company")));
    await assertFails(getDocs(collection(db, "employees")));
  });
  test("colecciones no declaradas se deniegan", async () => {
    await assertFails(setDoc(doc(adminCtx(), "secret", "x"), { a: 1 }));
  });
});

describe("roles y perfiles", () => {
  test("un trabajador no puede cambiar su propio rol", async () => {
    await assertFails(updateDoc(doc(workerCtx(), "users", WORKER), { role: "admin", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(workerCtx(), "users", WORKER), { displayName: "Ana T.", updatedAt: serverTimestamp() }));
  });
  test("un trabajador no lee perfiles ajenos; el admin sí", async () => {
    await assertFails(getDoc(doc(workerCtx(), "users", OTHER)));
    await assertSucceeds(getDoc(doc(adminCtx(), "users", OTHER)));
  });
  test("nadie puede auto-registrarse como administrador", async () => {
    const db = env.authenticatedContext("new1", { email: "cris@example.com", email_verified: true }).firestore();
    await assertFails(
      setDoc(doc(db, "users", "new1"), { email: "cris@example.com", displayName: "Cris", role: "admin", employeeId: "empC", active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: "new1" }),
    );
  });
  test("sin invitación no se puede crear perfil", async () => {
    const db = env.authenticatedContext("new2", { email: "intruso@example.com", email_verified: true }).firestore();
    await assertFails(
      setDoc(doc(db, "users", "new2"), { email: "intruso@example.com", displayName: "X", role: "worker", employeeId: "empC", active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: "new2" }),
    );
  });
  test("con email sin verificar no se puede activar", async () => {
    const db = env.authenticatedContext("new3", { email: "cris@example.com", email_verified: false }).firestore();
    await assertFails(
      setDoc(doc(db, "users", "new3"), { email: "cris@example.com", displayName: "Cris", role: "worker", employeeId: "empC", active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: "new3" }),
    );
  });
  test("activación correcta con invitación pendiente y email verificado", async () => {
    const db = env.authenticatedContext("new4", { email: "cris@example.com", email_verified: true }).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "users", "new4"), { email: "cris@example.com", displayName: "Cris Test", role: "worker", employeeId: "empC", active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: "new4" });
    batch.update(doc(db, "employees", "empC"), { userId: "new4", updatedAt: serverTimestamp() });
    batch.update(doc(db, "invitations", "cris@example.com"), { status: "accepted", acceptedBy: "new4", acceptedAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
  });
  test("no se puede vincular a la ficha de otra persona", async () => {
    const db = env.authenticatedContext("new5", { email: "cris@example.com", email_verified: true }).firestore();
    await assertFails(
      setDoc(doc(db, "users", "new5"), { email: "cris@example.com", displayName: "Cris", role: "worker", employeeId: "empA", active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: "new5" }),
    );
  });
  test("custom claim role=admin concede permisos de administración", async () => {
    const db = env.authenticatedContext("claimAdmin", { role: "admin", email: "x@example.com", email_verified: true }).firestore();
    await assertSucceeds(getDoc(doc(db, "employees", "empA")));
  });
  test("un administrador desactivado pierde el acceso", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "users", ADMIN), { active: false });
    });
    await assertFails(getDoc(doc(adminCtx(), "employees", "empA")));
  });
});

describe("flujos de administración en lote", () => {
  test("crear ficha + invitación en el mismo lote", async () => {
    const db = adminCtx();
    const batch = writeBatch(db);
    const ref = doc(collection(db, "employees"));
    batch.set(ref, {
      firstName: "Dani", lastName: "", email: "dani@example.com", emailLower: "dani@example.com", phone: "", position: "",
      hireDate: null, status: "active", photoURL: null, userId: null, notes: "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: ADMIN,
    });
    batch.set(doc(db, "invitations", "dani@example.com"), {
      email: "dani@example.com", employeeId: ref.id, displayName: "Dani", role: "worker", status: "pending",
      createdAt: serverTimestamp(), createdBy: ADMIN, acceptedBy: null, acceptedAt: null,
    });
    await assertSucceeds(batch.commit());
  });
  test("un trabajador no puede crear invitaciones", async () => {
    await assertFails(
      setDoc(doc(workerCtx(), "invitations", "x@example.com"), {
        email: "x@example.com", employeeId: "empA", displayName: "X", role: "worker", status: "pending",
        createdAt: serverTimestamp(), createdBy: WORKER, acceptedBy: null, acceptedAt: null,
      }),
    );
  });
});

describe("notas internas del evento", () => {
  test("solo administración lee y escribe las notas internas", async () => {
    const priv = { adminNotes: "Cliente habitual", updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(adminCtx(), "eventPrivate", "ev1"), priv));
    await assertSucceeds(getDoc(doc(adminCtx(), "eventPrivate", "ev1")));
    await assertFails(getDoc(doc(workerCtx(), "eventPrivate", "ev1")));
    await assertFails(setDoc(doc(workerCtx(), "eventPrivate", "ev1"), priv));
  });
});

describe("datos privados de empleados", () => {
  test("el trabajador lee su ficha pero no la de otros", async () => {
    await assertSucceeds(getDoc(doc(workerCtx(), "employees", "empA")));
    await assertFails(getDoc(doc(workerCtx(), "employees", "empB")));
    await assertFails(getDocs(collection(workerCtx(), "employees")));
  });
  test("el trabajador solo puede cambiar su teléfono", async () => {
    await assertSucceeds(updateDoc(doc(workerCtx(), "employees", "empA"), { phone: "611111111", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(workerCtx(), "employees", "empA"), { position: "Jefe", updatedAt: serverTimestamp() }));
  });
});

describe("eventos, turnos y compañeros", () => {
  test("el trabajador ve eventos y turnos en los que está asignado", async () => {
    await assertSucceeds(getDoc(doc(workerCtx(), "events", "ev1")));
    await assertSucceeds(getDoc(doc(workerCtx(), "shifts", "sh1")));
    await assertFails(getDoc(doc(workerCtx(), "shifts", "sh2")));
  });
  test("solo ve el equipo de turnos confirmados compartidos", async () => {
    await assertSucceeds(getDoc(doc(workerCtx(), "shiftTeams", "sh1")));
    await assertFails(getDoc(doc(workerCtx(), "shiftTeams", "sh2")));
  });
  test("un trabajador no puede asignarse a un turno", async () => {
    await assertFails(
      setDoc(doc(workerCtx(), "assignments", "sh2_empA"), {
        shiftId: "sh2", eventId: "ev1", employeeId: "empA", employeeName: "Ana Test", eventName: "Boda", shiftName: "Montaje",
        shiftStartAt: ts(now), shiftEndAt: ts(now + 3600000), status: "confirmed", cancelledReason: "",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: WORKER,
      }),
    );
    await assertFails(updateDoc(doc(workerCtx(), "shifts", "sh1"), { staffEmployeeIds: ["empA", "empB"] }));
  });
  test("el trabajador responde Sí/No a su asignación y no puede tocar nada más", async () => {
    await assertSucceeds(updateDoc(doc(workerCtx(), "assignments", "sh1_empA"), { workerResponse: "accepted", responseAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(workerCtx(), "assignments", "sh1_empA"), { workerResponse: "declined", responseAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(workerCtx(), "assignments", "sh1_empA"), { status: "cancelled", workerResponse: "declined", responseAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(workerCtx(), "assignments", "sh1_empA"), { transport: "Coche propio" }));
    await assertFails(updateDoc(doc(workerCtx(OTHER, "bru@example.com"), "assignments", "sh1_empA"), { workerResponse: "accepted", responseAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(adminCtx(), "assignments", "sh1_empA"), { transport: "Berlingo con Sara", updatedAt: serverTimestamp() }));
  });
  test("el trabajador consulta solo sus asignaciones", async () => {
    await assertSucceeds(getDocs(query(collection(workerCtx(), "assignments"), where("employeeId", "==", "empA"))));
    await assertFails(getDocs(query(collection(workerCtx(), "assignments"), where("employeeId", "==", "empB"))));
  });
  test("el admin crea eventos válidos y se rechazan campos extra", async () => {
    const db = adminCtx();
    const base = { name: "Fiesta", description: "", date: "2026-06-01", location: loc, instructions: "", status: "draft", staffEmployeeIds: [], shiftCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: ADMIN };
    await assertSucceeds(addDoc(collection(db, "events"), base));
    await assertFails(addDoc(collection(db, "events"), { ...base, hacked: true }));
    await assertFails(addDoc(collection(db, "events"), { ...base, status: "inventado" }));
    await assertSucceeds(addDoc(collection(db, "events"), { ...base, category: "comunion" }));
    await assertFails(addDoc(collection(db, "events"), { ...base, category: "inventado" }));
    const sheet = { meetingTime: "13:45", meetingPlace: "Nave", startTime: "15:30", endTime: "19:30", room: "", kids: 19, ages: "4-10", dressCode: "", material: "Zona infantil", contactPhone: "600000000", totalPrice: 1087, paidAmount: 300, extraHour: "50 €/h" };
    await assertSucceeds(addDoc(collection(db, "events"), { ...base, category: "comunion", ...sheet }));
    await assertFails(addDoc(collection(db, "events"), { ...base, ...sheet, meetingTime: "25:00" }));
  });
});

describe("fichajes", () => {
  test("entrada válida con asignación confirmada", async () => {
    await assertSucceeds(setDoc(doc(workerCtx(), "attendanceSessions", "sh1_empA"), sessionDoc()));
  });
  test("no se puede fichar en un turno no confirmado ni por otra persona", async () => {
    await assertFails(setDoc(doc(workerCtx(OTHER, "bru@example.com"), "attendanceSessions", "sh2_empB"), { ...sessionDoc("empB", OTHER), shiftId: "sh2", employeeName: "Bru Test" }));
    await assertFails(setDoc(doc(workerCtx(OTHER, "bru@example.com"), "attendanceSessions", "sh1_empA"), sessionDoc("empA", OTHER)));
  });
  test("la hora del servidor es obligatoria", async () => {
    await assertFails(setDoc(doc(workerCtx(), "attendanceSessions", "sh1_empA"), { ...sessionDoc(), checkIn: { ...punch(), serverAt: Timestamp.now() } }));
  });
  test("no se puede modificar la entrada ni reabrir una jornada cerrada", async () => {
    const db = workerCtx();
    await assertSucceeds(setDoc(doc(db, "attendanceSessions", "sh1_empA"), sessionDoc()));
    await assertFails(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { checkIn: punch(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { status: "closed", checkOut: punch(), workedMinutes: 60, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { status: "open", checkOut: null, workedMinutes: null, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "attendanceSessions", "sh1_empA")));
  });
  test("secuencia de pausa: inicio y fin en lote", async () => {
    const db = workerCtx();
    await assertSucceeds(setDoc(doc(db, "attendanceSessions", "sh1_empA"), sessionDoc()));
    const b1 = writeBatch(db);
    b1.set(doc(db, "breakRecords", "sh1_empA_1"), { sessionId: "sh1_empA", employeeId: "empA", userId: WORKER, index: 1, start: punch(), end: null, durationMinutes: null });
    b1.update(doc(db, "attendanceSessions", "sh1_empA"), { status: "on_break", breakCount: 1, updatedAt: serverTimestamp() });
    await assertSucceeds(b1.commit());
    // No se puede salir estando en pausa
    await assertFails(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { status: "closed", checkOut: punch(), workedMinutes: 10, updatedAt: serverTimestamp() }));
    const b2 = writeBatch(db);
    b2.update(doc(db, "breakRecords", "sh1_empA_1"), { end: punch(), durationMinutes: 5 });
    b2.update(doc(db, "attendanceSessions", "sh1_empA"), { status: "open", totalBreakMinutes: 5, updatedAt: serverTimestamp() });
    await assertSucceeds(b2.commit());
    // Consulta de pausas: debe filtrar por el propio userId
    await assertSucceeds(getDocs(query(collection(db, "breakRecords"), where("sessionId", "==", "sh1_empA"), where("userId", "==", WORKER))));
    await assertFails(getDocs(query(collection(db, "breakRecords"), where("sessionId", "==", "sh1_empA"))));
  });
  test("iniciar pausa sin registro de pausa falla", async () => {
    const db = workerCtx();
    await assertSucceeds(setDoc(doc(db, "attendanceSessions", "sh1_empA"), sessionDoc()));
    await assertFails(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { status: "on_break", breakCount: 1, updatedAt: serverTimestamp() }));
  });
  test("las incidencias solo se pueden añadir", async () => {
    const db = workerCtx();
    const inc = { type: "outside_radius", stage: "check_in", message: "lejos", at: Timestamp.now() };
    await assertSucceeds(setDoc(doc(db, "attendanceSessions", "sh1_empA"), { ...sessionDoc(), incidents: [inc], hasIncident: true }));
    await assertFails(updateDoc(doc(db, "attendanceSessions", "sh1_empA"), { status: "closed", checkOut: punch(), workedMinutes: 10, incidents: [], hasIncident: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(
      updateDoc(doc(db, "attendanceSessions", "sh1_empA"), {
        status: "closed", checkOut: punch(), workedMinutes: 10,
        incidents: arrayUnion({ type: "low_accuracy", stage: "check_out", message: "x", at: Timestamp.now() }), hasIncident: true, updatedAt: serverTimestamp(),
      }),
    );
  });
  test("comprobar si existe la jornada propia (get de documento inexistente)", async () => {
    await assertSucceeds(getDoc(doc(workerCtx(), "attendanceSessions", "sh1_empA")));
    await assertFails(getDoc(doc(workerCtx(), "attendanceSessions", "sh2_empB")));
  });
});

describe("disponibilidad", () => {
  const week = (employeeId: string, by: string) => ({
    employeeId, weekStart: "2026-05-04",
    days: Array.from({ length: 7 }, (_, i) => ({ date: `2026-05-${String(4 + i).padStart(2, "0")}`, status: i === 0 ? "partial" : "available", slots: i === 0 ? [{ start: "09:00", end: "13:00" }] : [] })),
    note: "", updatedAt: serverTimestamp(), updatedBy: by,
  });
  test("el trabajador guarda la suya y no la de otros", async () => {
    await assertSucceeds(setDoc(doc(workerCtx(), "availability", "empA_2026-05-04"), week("empA", WORKER)));
    await assertFails(setDoc(doc(workerCtx(), "availability", "empB_2026-05-04"), week("empB", WORKER)));
    await assertSucceeds(getDoc(doc(workerCtx(), "availability", "empA_2026-05-11")));
    await assertFails(getDoc(doc(workerCtx(), "availability", "empB_2026-05-04")));
  });
});

describe("notificaciones y auditoría", () => {
  test("solo el destinatario lee y marca como leída", async () => {
    await assertSucceeds(getDoc(doc(workerCtx(), "notifications", "n1")));
    await assertFails(getDoc(doc(workerCtx(OTHER, "bru@example.com"), "notifications", "n1")));
    await assertFails(getDoc(doc(adminCtx(), "notifications", "n1")));
    await assertFails(updateDoc(doc(workerCtx(), "notifications", "n1"), { title: "otro" }));
    await assertSucceeds(updateDoc(doc(workerCtx(), "notifications", "n1"), { read: true, readAt: serverTimestamp() }));
  });
  test("un trabajador solo puede crear avisos de incidencia para administración", async () => {
    const base = { title: "x", body: "", link: null, read: false, readAt: null, createdAt: serverTimestamp(), createdBy: WORKER };
    await assertSucceeds(addDoc(collection(workerCtx(), "notifications"), { ...base, type: "attendance_incident", recipientEmployeeId: null, recipientRole: "admin" }));
    await assertFails(addDoc(collection(workerCtx(), "notifications"), { ...base, type: "general", recipientEmployeeId: "empB", recipientRole: null }));
  });
  test("el registro de auditoría es de solo inserción", async () => {
    const ref = await assertSucceeds(addDoc(collection(adminCtx(), "auditLogs"), { actorUid: ADMIN, action: "x", entityType: "event", entityId: "ev1", summary: "", at: serverTimestamp() }));
    await assertFails(updateDoc(doc(adminCtx(), "auditLogs", ref.id), { summary: "cambiado" }));
    await assertFails(deleteDoc(doc(adminCtx(), "auditLogs", ref.id)));
    await assertFails(addDoc(collection(workerCtx(), "auditLogs"), { actorUid: ADMIN, action: "x", entityType: "attendance", entityId: "a", summary: "", at: serverTimestamp() }));
  });
});
