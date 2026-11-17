# Arquitectura

```
app/            Rutas (App Router, exportación estática). Solo composición de UI.
components/     UI reutilizable (components/ui estilo shadcn) y layout (shell, estados, badges).
features/       Componentes por dominio (auth, employees, events, assignments, availability, attendance, notifications, worker).
hooks/          useAsync/useAction (carga y errores), useGeolocation.
services/       Lógica de aplicación: AuthService, EmployeeService, EventService, ShiftService,
                AvailabilityService, AssignmentService, AttendanceService, NotificationService, ReportService, SettingsService.
services/domain Reglas de negocio PURAS (solapes, máquina de estados de fichaje, evaluación GPS, informes). Probadas con tests unitarios.
repositories/   contracts.ts (interfaces) + firestore/* (implementación). Único código que toca Firestore.
lib/firebase/   Inicialización perezosa del SDK, conversores, nombres de colecciones.
schemas/        Validación de formularios con Zod.
types/          Tipos de dominio de todas las colecciones.
utils/          Fechas con zona horaria, geodistancia, CSV, errores.
```

Flujo: **Componente → hook → Servicio → Repositorio (interfaz) → Firestore**. Los componentes no importan `firebase/*` (excepto vía `services`).

## Preparado para backend
- **Repositorios intercambiables**: `services/index.ts` es el único punto de cableado. Para usar una API o Cloud Functions se escribe `repositories/http/*` implementando los mismos contratos.
- **Fichajes**: `AttendanceLocationValidator` (hoy `ClientLocationValidator`). Un validador de servidor recalcularía distancia y sellaría el registro; después se restringirían las reglas para que solo el backend escriba `attendanceSessions`.
- **Asignaciones transaccionales**: `AssignmentRepository.applyMutation` recibe una mutación declarativa → trasladable tal cual a un endpoint que haga también la comprobación de solapes dentro de la transacción.
- **Alta segura de usuarios**: `InvitationRepository` + `AuthService`; con backend, un endpoint con Admin SDK podría crear la cuenta y enviar el email.
- **Notificaciones**: `NotificationChannel` (hoy solo `InAppNotificationChannel`). Añadir `EmailChannel`/`PushChannel` al constructor de `NotificationService`.
- **Roles**: claims o documento, resuelto en un solo sitio (`AuthService.resolveSession` + `isAdmin()` en reglas).

Nada de lo anterior está implementado en servidor: son puntos de extensión, no funciones simuladas.
