#!/usr/bin/env node
/**
 * Alta controlada del PRIMER administrador (o de administradores adicionales).
 *
 * Se ejecuta en el ordenador del propietario del proyecto, NUNCA en el navegador.
 * Usa el Admin SDK con una cuenta de servicio, que funciona con el plan Spark
 * (no requiere Cloud Functions ni Blaze).
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/bootstrap-admin.mjs --project <id> --email admin@empresa.com --name "Nombre Apellido" [--password "..."] [--claims]
 *
 *   --password  Crea la cuenta si no existe (si se omite, la cuenta debe existir ya:
 *               créala en Consola > Authentication > Añadir usuario).
 *   --claims    Además establece el custom claim role=admin (opcional, ver docs/ROLES_Y_ACCESO.md).
 *
 * Con emuladores: exporta FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y
 * FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (no hace falta cuenta de servicio).
 *
 * El archivo de la cuenta de servicio es un SECRETO: no lo subas al repositorio
 * (está en .gitignore) y bórralo cuando termines.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const projectId = arg("project");
const email = arg("email");
const name = arg("name");
const password = arg("password");
const withClaims = Boolean(arg("claims"));

if (typeof projectId !== "string" || typeof email !== "string" || typeof name !== "string") {
  console.error('Uso: node scripts/bootstrap-admin.mjs --project <id> --email <correo> --name "Nombre" [--password <clave>] [--claims]');
  process.exit(1);
}

const usingEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(usingEmulators ? { projectId } : { projectId, credential: applicationDefault() });

const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`✔ Cuenta existente: ${user.uid}`);
} catch (e) {
  if (e?.code !== "auth/user-not-found") throw e;
  if (typeof password !== "string") {
    console.error("✖ La cuenta no existe. Créala en la consola o pasa --password.");
    process.exit(1);
  }
  user = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  console.log(`✔ Cuenta creada: ${user.uid}`);
}

const ref = db.collection("users").doc(user.uid);
const snap = await ref.get();
const now = FieldValue.serverTimestamp();
await ref.set(
  {
    email: user.email ?? email,
    displayName: name,
    role: "admin",
    employeeId: snap.exists ? (snap.get("employeeId") ?? null) : null,
    active: true,
    createdAt: snap.exists ? snap.get("createdAt") : now,
    updatedAt: now,
    createdBy: snap.exists ? snap.get("createdBy") : user.uid,
  },
  { merge: false },
);
console.log(`✔ users/${user.uid} con rol "admin"`);

await db.collection("auditLogs").add({
  actorUid: user.uid,
  action: "bootstrap.admin",
  entityType: "user",
  entityId: user.uid,
  summary: `Administrador configurado por script: ${email}`,
  at: now,
});

if (withClaims) {
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: "admin" });
  console.log("✔ Custom claim role=admin establecido (el usuario debe volver a iniciar sesión).");
}

console.log("Listo.");
process.exit(0);
