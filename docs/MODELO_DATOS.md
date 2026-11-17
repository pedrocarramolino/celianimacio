# Modelo de datos (Cloud Firestore)

Convenciones:
- **Instantes** (creación, fichaje, inicio/fin de turno): `Timestamp`. Las fechas de auditoría (`createdAt`, `updatedAt`, `serverAt`) se escriben con `serverTimestamp()` y las reglas exigen que coincidan con `request.time`.
- **Fechas de calendario** sin hora: cadena `YYYY-MM-DD` en zona **Europe/Madrid** (`hireDate`, `event.date`, `shift.date`, días de disponibilidad).
- **Horas de reloj**: `HH:mm` (franjas de disponibilidad).
- Ids deterministas donde evitan duplicados: `assignments/{shiftId}_{employeeId}`, `attendanceSessions/{shiftId}_{employeeId}`, `availability/{employeeId}_{weekStart}`, `breakRecords/{sessionId}_{n}`, `invitations/{emailEnMinúsculas}`, `users/{uid}`.
- Tipos TypeScript en `types/` (el dominio usa `Date`; los repositorios convierten).

## Colecciones

| Colección | Contenido | Lectura | Escritura |
|---|---|---|---|
| `users/{uid}` | email, displayName, **role**, employeeId, active | propio / admin | admin; el propio solo `displayName`; alta con invitación |
| `employees/{id}` | ficha privada: nombre, email, teléfono, puesto, hireDate, status, photoURL, userId, notas | propio (userId) / admin | admin; el propio solo `phone`; vínculo `userId` al activar |
| `invitations/{email}` | employeeId, displayName, status (`pending/accepted/revoked`) | admin / el dueño del email verificado | admin; el invitado solo la acepta |
| `locations/{id}` | lugares reutilizables con lat/lng/radio | admin | admin |
| `events/{id}` | nombre, descripción, fecha, **location** (instantánea), instrucciones, status, `staffEmployeeIds`, `shiftCount` | admin / personal asignado | admin |
| `shifts/{id}` | eventId, eventName, nombre, date, startAt, endAt, requiredWorkers, position, location?, instrucciones, status, `staffEmployeeIds`, `confirmedEmployeeIds` | admin / personal asignado | admin |
| `shiftTeams/{shiftId}` | **solo nombres** de compañeros confirmados | admin / miembros confirmados | admin |
| `availability/{emp}_{lunes}` | 7 días: status (`unset/available/partial/unavailable`) + franjas | propio / admin | propio / admin |
| `assignments/{shift}_{emp}` | status (`pending/confirmed/cancelled`), copia de horas del turno | propio / admin | **solo admin** |
| `attendanceSessions/{shift}_{emp}` | checkIn, checkOut (coords, precisión, distancia, dentro del radio, hora cliente y servidor), pausas, minutos, incidencias | propio / admin | propio (transiciones válidas) / admin (cierre) |
| `breakRecords/{session}_{n}` | inicio/fin de pausa | propio / admin | propio / admin (cierre) |
| `notifications/{id}` | tipo, título, cuerpo, enlace, destinatario (`recipientEmployeeId` **o** `recipientRole: "admin"`), leída | solo destinatario | admin; trabajador solo incidencias → admins; destinatario marca leída/borra |
| `auditLogs/{id}` | actor, acción, entidad, resumen, `at` | admin | solo inserción |
| `settings/company` | nombre, radio por defecto, precisión máx., margen de fichaje | usuarios con perfil | admin |

`invitations`, `shiftTeams` y `settings` se añaden a la lista original por necesidad: activación segura sin backend, privacidad de compañeros y parámetros globales.

## Relaciones
```
users (uid) ──1:0..1── employees ──1:N── assignments ──N:1── shifts ──N:1── events ──N:0..1── locations (copia)
                 │                     └─1:0..1─ attendanceSessions ──1:N── breakRecords
                 └── invitations (por email) ──→ employees
employees ──1:N── availability (por semana)
employees ──1:N── notifications (recipientEmployeeId)
shifts ──1:1── shiftTeams
```

## Datos duplicados a propósito (y por qué)
- `event.location` y `shift.location`: **instantánea** de la ubicación → los fichajes históricos no cambian si se edita la ubicación reutilizable.
- `staffEmployeeIds` en eventos/turnos: las reglas necesitan saber quién puede leer el documento sin hacer consultas.
- `shiftTeams`: expone solo el nombre de los compañeros confirmados (nunca la ficha privada).
- `assignments.shiftStartAt/EndAt`, `eventName`, `shiftName`, `employeeName`: detectar solapes con una sola consulta y mostrar asignaciones canceladas aunque el trabajador ya no pueda leer el turno. Se mantienen al editar el turno/evento (mismo lote).
- `attendanceSessions.*Name` y horas: el informe no necesita lecturas adicionales; las reglas comprueban que coincidan con la asignación.

Estas proyecciones se actualizan en **transacciones o lotes** (`AssignmentRepository.applyMutation`, `ShiftRepository.update/cancel`, `EventRepository.cancelCascade`).

## Índices (`firestore.indexes.json`)
| Colección | Campos | Uso |
|---|---|---|
| assignments | employeeId ↑, shiftEndAt ↑ | detección de solapes |
| notifications | recipientEmployeeId ↑, createdAt ↓ | avisos del trabajador |
| notifications | recipientRole ↑, createdAt ↓ | avisos de administración |
| attendanceSessions | userId ↑, createdAt ↓ | historial del trabajador |

El resto de consultas usan índices de un solo campo o igualdades combinadas (automáticos).

## Estados
- Evento: `draft → scheduled → in_progress → completed`, o `cancelled` (cascada a turnos y asignaciones).
- Turno: `open / partially_filled / filled` (calculado por confirmados vs. plazas) o `cancelled`.
- Asignación: `pending ↔ confirmed`, `→ cancelled` (reactivable).
- Jornada: `open → on_break → open → closed` (solo `open → closed` para salir).
