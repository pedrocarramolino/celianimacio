/**
 * Prueba de humo end-to-end contra los emuladores de Firebase (Auth + Firestore).
 * Recorre el flujo completo: admin crea trabajador, evento, turno y asignación;
 * el trabajador activa su cuenta, indica disponibilidad y ficha con GPS simulado.
 *
 * Requisitos: emuladores en marcha, app compilada con NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
 * y servida en BASE_URL. Ver docs/PRUEBAS.md.
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const PROJECT = process.env.PROJECT_ID || "demo-celianimacio";
const SHOTS = process.env.SHOTS_DIR || null;
const ADMIN = { email: "admin@example.com", password: "Admin12345" };
const WORKER = { email: "ana@example.com", password: "Worker12345" };
const COORDS = { latitude: 41.3874, longitude: 2.1686 };

function madrid(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

async function step(name, fn) {
  process.stdout.write(`• ${name} … `);
  await fn();
  console.log("ok");
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const adminCtx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const admin = await adminCtx.newPage();
  admin.on("pageerror", (e) => errors.push(`admin: ${e.message}`));
  global.__pages = [admin];

  // Turno que empezó hace 30 min y dura 3 h (dentro de la ventana de fichaje).
  // Si cruza la medianoche en Madrid, se usa mañana para evitar ambigüedades.
  let start = new Date(Date.now() - 30 * 60000);
  let end = new Date(Date.now() + 150 * 60000);
  let s = madrid(start);
  let e = madrid(end);
  const crossesMidnight = s.date !== e.date;

  await step("login administrador", async () => {
    await admin.goto(`${BASE}/login/`);
    await admin.getByLabel("Correo electrónico").fill(ADMIN.email);
    await admin.getByLabel("Contraseña").fill(ADMIN.password);
    await admin.getByRole("button", { name: "Entrar" }).click();
    await admin.waitForURL(`${BASE}/admin/`);
    await admin.getByText("Trabajadores activos").waitFor();
  });

  await step("crear trabajador con invitación", async () => {
    await admin.goto(`${BASE}/admin/trabajadores/nuevo/`);
    await admin.getByLabel("Nombre", { exact: false }).first().fill("Ana");
    await admin.getByLabel("Apellidos").fill("Prueba");
    await admin.getByLabel("Correo electrónico").fill(WORKER.email);
    await admin.getByLabel("Teléfono").fill("600123123");
    await admin.getByLabel("Puesto de trabajo").fill("Animadora");
    await admin.getByRole("button", { name: "Crear trabajador" }).click();
    await admin.waitForURL(/\/admin\/trabajadores\/ficha\/\?id=/);
    await admin.getByRole("tab", { name: "Acceso" }).click();
    await admin.getByText("Invitación pendiente").waitFor();
  });

  let eventUrl;
  await step("crear evento", async () => {
    await admin.goto(`${BASE}/admin/eventos/nuevo/`);
    await admin.getByLabel("Nombre", { exact: false }).first().fill("Boda Prueba");
    await admin.getByLabel("Fecha del evento").fill(s.date);
    await admin.getByLabel("Instrucciones para el personal").fill("Llegar 15 minutos antes.");
    await admin.getByLabel("Nombre del lugar").fill("Masía de prueba");
    await admin.getByLabel("Dirección").fill("Camí de prova 1");
    await admin.getByLabel("Latitud").fill(String(COORDS.latitude));
    await admin.getByLabel("Longitud").fill(String(COORDS.longitude));
    await admin.getByLabel("Radio permitido para fichar (m)").fill("200");
    await admin.getByRole("button", { name: "Crear evento" }).click();
    await admin.waitForURL(/\/admin\/eventos\/detalle\/\?id=/);
    eventUrl = admin.url();
  });

  await step("añadir turno", async () => {
    await admin.getByRole("button", { name: "Añadir turno" }).click();
    const d = admin.getByRole("dialog");
    await d.getByLabel("Nombre del turno").fill("Animación");
    await d.getByLabel("Fecha").fill(s.date);
    await d.getByLabel("Trabajadores necesarios").fill("2");
    await d.getByLabel("Hora de inicio").fill(s.time);
    await d.getByLabel("Hora de fin").fill(crossesMidnight ? "23:59" : e.time);
    await d.getByRole("button", { name: "Guardar turno" }).click();
    await d.waitFor({ state: "hidden" });
    await admin.getByText("0 confirmados de 2").waitFor();
  });

  await step("confirmar asignación", async () => {
    await admin.getByRole("link", { name: "Asignar" }).first().click();
    await admin.waitForURL(/\/admin\/asignaciones\/\?turno=/);
    await admin.getByText("Ana Prueba").first().waitFor();
    await admin.getByRole("button", { name: "Confirmar" }).first().click();
    await admin.getByText("1/2 confirmados").waitFor();
    if (SHOTS) await admin.screenshot({ path: `${SHOTS}/admin-asignaciones.png` });
  });

  // ---- Trabajador
  const workerCtx = await browser.newContext({
    ...require("playwright").devices["Pixel 7"],
    geolocation: COORDS,
    permissions: ["geolocation"],
  });
  const worker = await workerCtx.newPage();
  worker.on("pageerror", (err) => errors.push(`worker: ${err.message}`));
  worker.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(`worker console: ${m.text().slice(0, 300)}`));
  global.__pages.push(worker);

  await step("registro y verificación del trabajador", async () => {
    await worker.goto(`${BASE}/activar/`);
    await worker.getByLabel("Correo electrónico").fill(WORKER.email);
    await worker.getByLabel("Contraseña", { exact: false }).first().fill(WORKER.password);
    await worker.getByLabel("Repite la contraseña").fill(WORKER.password);
    await worker.getByRole("button", { name: "Crear cuenta" }).click();
    await worker.getByText("Hemos enviado un enlace de verificación").waitFor();
    const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`);
    const { oobCodes } = await res.json();
    const code = oobCodes.reverse().find((c) => c.email === WORKER.email && c.requestType === "VERIFY_EMAIL");
    if (!code) throw new Error("No se encontró el código de verificación");
    await fetch(code.oobLink);
    await worker.getByRole("button", { name: "Ya lo he verificado" }).click();
    await worker.getByText("Invitación encontrada").waitFor();
    await worker.getByRole("button", { name: "Activar mi cuenta" }).click();
    await worker.waitForURL(`${BASE}/trabajador/`);
    await worker.getByText("Tu próximo turno").waitFor();
    await worker.getByText("Masía de prueba").first().waitFor();
    if (SHOTS) await worker.screenshot({ path: `${SHOTS}/trabajador-inicio.png` });
  });

  await step("disponibilidad semanal", async () => {
    await worker.goto(`${BASE}/trabajador/disponibilidad/`);
    await worker.getByRole("button", { name: "Marcar toda la semana disponible" }).click();
    await worker.getByRole("button", { name: "Guardar disponibilidad" }).click();
    await worker.getByText("Disponibilidad guardada.").waitFor();
  });

  const punch = async (label) => {
    await worker.getByRole("button", { name: label }).click();
    const d = worker.getByRole("dialog");
    await d.getByText("Dentro del radio autorizado").waitFor();
    await d.getByRole("button", { name: "Registrar" }).click();
    await worker.getByText(`${label} registrada`).waitFor();
  };

  await step("fichaje: entrada, pausa y salida con GPS", async () => {
    await worker.goto(`${BASE}/trabajador/fichar/`);
    await worker.getByText("radio autorizado").waitFor();
    await punch("Entrada");
    await punch("Inicio de pausa");
    await punch("Fin de pausa");
    if (SHOTS) await worker.screenshot({ path: `${SHOTS}/trabajador-fichar.png` });
    await punch("Salida");
    await worker.getByText("Finalizado").first().waitFor();
  });

  await step("el trabajador no puede abrir el panel de administración", async () => {
    await worker.goto(`${BASE}/admin/`);
    await worker.waitForURL(`${BASE}/trabajador/`);
  });

  await step("admin ve el fichaje, la notificación y el informe", async () => {
    await admin.goto(`${BASE}/admin/fichajes/`);
    await admin.getByText("Ana Prueba").first().waitFor();
    await admin.goto(`${BASE}/admin/informes/`);
    await admin.getByRole("heading", { name: "Horas por trabajador" }).waitFor();
    await admin.getByRole("cell", { name: "Ana Prueba" }).waitFor();
    await admin.goto(`${BASE}/admin/`);
    await admin.getByText("Fichajes de hoy").waitFor();
    if (SHOTS) await admin.screenshot({ path: `${SHOTS}/admin-dashboard.png` });
  });

  await step("cancelar evento notifica al trabajador", async () => {
    await admin.goto(eventUrl);
    await admin.getByRole("button", { name: "Cancelar evento" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Cancelar evento" }).click();
    await admin.getByText("Evento cancelado", { exact: true }).waitFor();
    await worker.goto(`${BASE}/trabajador/notificaciones/`);
    await worker.getByText("Evento cancelado: Boda Prueba").waitFor();
  });

  await browser.close();
  if (errors.length) {
    console.error("Errores de página:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("\nPrueba E2E completada sin errores.");
})().catch(async (err) => {
  console.error("\nFALLO:", err.message);
  for (const pg of global.__pages || []) {
    try { console.error("--- " + pg.url() + "\n" + (await pg.locator("body").innerText()).slice(0, 1500)); } catch {}
  }
  process.exit(1);
});
