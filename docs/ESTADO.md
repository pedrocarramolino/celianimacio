# Estado del proyecto

## Fases
| Fase | Estado |
|---|---|
| 1. Proyecto Next.js + Firebase Spark | ✅ Exportación estática, Hosting, emuladores, variables de ejemplo |
| 2. Autenticación, roles y seguridad | ✅ Login, recuperación, cierre de sesión, activación por invitación, guardas de ruta, reglas completas (32 pruebas) |
| 3. Trabajadores | ✅ Alta, edición, invitación, estado, historial de turnos y horas |
| 4. Eventos, ubicaciones y turnos | ✅ CRUD, cancelación en cascada, ubicaciones reutilizables |
| 5. Disponibilidad semanal | ✅ Editor del trabajador; vista y edición del administrador con filtros |
| 6. Asignaciones | ✅ Manual, disponibilidad visible, bloqueo de solapes, transacción con proyecciones |
| 7. Fichajes GPS y pausas | ✅ Validación en cliente + hora de servidor + secuencia en reglas; incidencias |
| 8. Notificaciones e informes | ✅ Internas; informes con CSV e impresión/PDF |
| 9. Pruebas | ✅ Unitarias, reglas y E2E en navegador (escritorio y móvil emulado). ⏳ Pruebas con GPS real en dispositivos |
| 10. Documentación | ✅ `docs/` |

## Pendiente / siguientes pasos
- **Requiere backend (Blaze o servidor propio)**: validación de fichajes en servidor, comprobación de solapes dentro de la transacción, envío de correo/push, recordatorios automáticos, subida de fotos (Storage), creación de cuentas por el administrador, auditoría inviolable, copias de seguridad gestionadas.
- **Posible en Spark, no incluido aún**: exportación PDF con maquetación propia (hoy: imprimir → Guardar como PDF), paginación en listados muy grandes (hoy se cargan completos: adecuado para decenas de trabajadores y cientos de eventos), edición de fichajes por el administrador más allá del cierre manual, mapa embebido, modo oscuro.
- Revisar en dispositivos reales iOS/Android la precisión GPS y la instalación PWA.
