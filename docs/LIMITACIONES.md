# Limitaciones reales del plan Firebase Spark (gratuito)

Esta versión funciona **íntegramente en Spark**, sin tarjeta y sin Cloud Functions. Esto implica limitaciones que conviene conocer antes de usarla en producción.

## 1. No hay backend privilegiado
- **Cloud Functions requiere Blaze.** Toda la lógica (asignaciones, fichajes, notificaciones) se ejecuta en el navegador.
- La protección real la imponen **Firebase Authentication + `firestore.rules`**: validan quién puede leer/escribir cada documento, la estructura de los campos, los estados permitidos y las transiciones de fichaje.
- Hay reglas de negocio que **las reglas de Firestore no pueden verificar** porque necesitan consultas: p. ej. que un trabajador no tenga **dos turnos solapados**. La app lo comprueba antes de asignar, pero un administrador que manipulara el cliente (o dos administradores simultáneos) podría saltárselo. Solo los administradores pueden asignar, así que el riesgo se limita a personas de confianza.

## 2. Fichaje GPS: no es antifraude
- La posición la obtiene el navegador del trabajador y la distancia se calcula **en su dispositivo**. Un usuario con conocimientos puede falsear la ubicación (simuladores, extensiones, modificar la petición).
- Lo que **sí** está garantizado por las reglas:
  - La **hora** guardada (`serverAt`) es la del servidor de Firestore (`request.time`), no la del móvil.
  - Solo se puede fichar en un turno **propio y confirmado**, en una ventana de 2 h antes del inicio hasta el fin del turno.
  - La secuencia es válida (entrada → pausa ↔ fin de pausa → salida), no hay duplicados (id determinista `turno_empleado`), la entrada no se puede modificar y una jornada cerrada no se puede reabrir ni borrar.
  - Las incidencias solo pueden **añadirse**, nunca eliminarse.
- Fichar fuera del radio o sin GPS **no se bloquea**: se registra con incidencia y se avisa a administración. Úsalo como indicio, no como prueba.
- Migración prevista: `AttendanceLocationValidator` (en `services/attendance.service.ts`) tiene una implementación cliente; un `ServerLocationValidator` (endpoint/Cloud Function) podría recalcular la distancia y escribir el registro con privilegios, y las reglas dejarían de permitir escritura directa.

## 3. Alta de cuentas de trabajadores
- Desde el navegador **no se pueden crear cuentas ajenas de forma privilegiada** (eso requiere el Admin SDK en un servidor).
- Solución en Spark: **invitación + autoregistro verificado** (ver `ROLES_Y_ACCESO.md`). El administrador crea la ficha y la invitación; el trabajador crea su propia cuenta y verifica su email. Hasta que no se vincula a una invitación pendiente, la cuenta no tiene ningún permiso.
- Consecuencia: el registro por email/contraseña de Firebase Auth debe estar habilitado, por lo que cualquiera podría crear una cuenta *vacía* (sin acceso a datos). Las reglas lo neutralizan.
- La app **no envía correos de invitación** (no hay servidor de correo). El administrador copia el mensaje o lo abre en su cliente de correo. Los correos de *verificación* y *recuperación de contraseña* sí los envía Firebase Auth (incluidos en Spark).

## 4. Notificaciones
- Solo **notificaciones internas** (colección `notifications`). Se ven al abrir la app.
- **No hay correo ni push automáticos.** Las interfaces están preparadas (`NotificationChannel`), pero no hay implementación porque requieren un backend (FCM necesita un servidor que envíe los mensajes).
- No hay recordatorios programados automáticos (requieren tareas programadas = Cloud Functions/Scheduler). El administrador puede enviar recordatorios manualmente desde **Avisos**.

## 5. Fotografías
- Desde octubre de 2024 los **nuevos buckets de Cloud Storage requieren Blaze**. Por eso la foto del trabajador es una **URL https** opcional, sin subida de archivos.

## 6. Hosting y renderizado
- Firebase Hosting en Spark solo sirve **contenido estático**. El SSR de Next.js en Firebase (App Hosting / frameworks) requiere Blaze.
- La app usa `output: "export"`: todas las páginas son estáticas y los datos se cargan en el cliente. Las rutas de detalle usan parámetros de consulta (`/admin/eventos/detalle/?id=...`).
- La protección de rutas por rol es **de interfaz** (redirige); la protección de los datos está en las reglas.

## 7. Cuotas gratuitas (orientativas, consulta la tabla oficial vigente)
- Firestore: ~50.000 lecturas, 20.000 escrituras y 20.000 borrados al día; 1 GiB almacenado.
- Hosting: 10 GB almacenamiento, ~360 MB/día de transferencia.
- Authentication email/contraseña: sin coste para volúmenes normales; envíos de email sujetos a límites diarios.
- Al superar una cuota, las operaciones fallan hasta el día siguiente (la app muestra "Se ha alcanzado la cuota gratuita diaria").
- Las reglas usan `get()` sobre `users/{uid}` para resolver el rol: cada evaluación cuenta como lectura adicional. Con custom claims se evitaría.

## 8. Auditoría
- `auditLogs` es de solo inserción (nadie puede editar ni borrar), pero lo escribe el propio cliente: un cliente manipulado podría **omitir** registros. No es una auditoría a prueba de manipulaciones.

## 9. Otros
- Zona horaria fija: **Europe/Madrid**.
- Sin modo offline para fichar: hace falta conexión para obtener la hora del servidor.
- Operaciones masivas (cancelar un evento) usan un lote atómico de máx. ~480 escrituras.
