# Pruebas

| Comando | Qué prueba | Requisitos |
|---|---|---|
| `npm run typecheck` | TypeScript estricto | — |
| `npm run lint` | ESLint (Next + TS) | — |
| `npm test` | 17 pruebas unitarias de dominio: zonas horarias y cambio de hora, turnos que cruzan medianoche, distancia GPS, máquina de estados de fichaje, solapes, disponibilidad, CSV, informes | — |
| `npm run test:rules` | 32 pruebas de seguridad de `firestore.rules` en el emulador: roles, auto-registro como admin, invitaciones, privacidad de fichas y compañeros, asignaciones, secuencia de fichaje, hora de servidor, notificaciones, auditoría | Java 11+ |
| `tests/e2e/reset-and-run.sh` | Recorrido completo en navegador (Playwright): admin crea trabajador, evento, turno y asignación; el trabajador activa su cuenta, indica disponibilidad y ficha entrada/pausa/salida con GPS simulado; acceso denegado a /admin; informe; cancelación con aviso | emuladores + app compilada para emuladores |

## Ejecutar la prueba E2E
```bash
npx firebase emulators:start --only auth,firestore --project demo-celianimacio
```
En otra terminal:
```bash
cp tests/e2e/e2e.env .env.production.local && npm run build && rm .env.production.local
```
```bash
(cd out && python3 -m http.server 3000 --bind 127.0.0.1)
```
```bash
tests/e2e/reset-and-run.sh
```
(Si usas un proxy HTTP, exporta `NO_PROXY=127.0.0.1,localhost` antes de arrancar los emuladores.)

## Pruebas manuales recomendadas en móvil
- Instalar como PWA (Chrome Android: *Añadir a pantalla de inicio*; iOS Safari: *Compartir → Añadir a inicio*).
- Fichar con GPS real dentro y fuera del radio; con permiso de ubicación denegado (debe registrar incidencia).
- Rendimiento: las páginas cargan ~370 KB de JS (Firebase incluido); la caché persistente de Firestore reduce lecturas repetidas.
