#!/usr/bin/env bash
# Vacía los emuladores, crea el administrador de prueba con el script oficial y lanza la prueba E2E.
# Requiere: emuladores en marcha (auth 9099, firestore 8080) y la app servida en $BASE_URL.
set -euo pipefail
PROJECT="${PROJECT_ID:-demo-celianimacio}"
curl -sf -X DELETE "http://127.0.0.1:8080/emulator/v1/projects/$PROJECT/databases/(default)/documents" >/dev/null
curl -sf -X DELETE "http://127.0.0.1:9099/emulator/v1/projects/$PROJECT/accounts" >/dev/null
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  node scripts/bootstrap-admin.mjs --project "$PROJECT" --email admin@example.com --name "Admin Pruebas" --password Admin12345
node tests/e2e/smoke.cjs
