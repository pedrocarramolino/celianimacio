# Cel i Animació

Plataforma web (PWA) para gestionar el personal de una empresa de organización de eventos: trabajadores, disponibilidad semanal, eventos y turnos, asignaciones, fichajes con GPS y pausas, notificaciones internas e informes.

**Funciona íntegramente en el plan gratuito Firebase Spark**: sin Cloud Functions, sin tarjeta. Lee primero **[docs/LIMITACIONES.md](docs/LIMITACIONES.md)**.

## Tecnología
Next.js 15 (App Router, exportación estática) · TypeScript estricto · Tailwind CSS 4 · componentes estilo shadcn/ui (Radix) · Lucide · Firebase Authentication · Cloud Firestore + Security Rules · Firebase Hosting · React Hook Form + Zod · PWA.

## Funcionalidades
**Administración** (`/admin`): panel con métricas · trabajadores (ficha, acceso por invitación, historial de turnos y horas, activo/inactivo) · eventos (ubicación, coordenadas, radio, instrucciones, estados, cancelación en cascada) · turnos (uno o varios por evento, horario, plazas, puesto, ubicación propia) · calendario semanal · disponibilidad del equipo con filtros por semana/día/trabajador y solicitud por aviso · asignaciones manuales con disponibilidad visible, detección y bloqueo de solapes, confirmar/pendiente/cancelar · fichajes por día, jornadas abiertas, incidencias y cierre manual · informes por trabajador/evento/día, incompletos e incidencias con exportación CSV e impresión/PDF del navegador · avisos internos · configuración, ubicaciones, roles y registro de actividad.

**Trabajador** (`/trabajador`): inicio con próximo turno · eventos asignados con dirección, mapa, horario, instrucciones y compañeros confirmados (solo nombres) · fichaje móvil de entrada, pausa y salida con geolocalización · disponibilidad semanal por días y franjas · historial de horas · avisos · perfil.

## Puesta en marcha rápida
```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run dev
```
Guía completa: **[docs/INSTALACION.md](docs/INSTALACION.md)**.

## Documentación
- [Instalación y despliegue](docs/INSTALACION.md)
- [Limitaciones del plan Spark](docs/LIMITACIONES.md)
- [Roles, primer administrador e invitaciones](docs/ROLES_Y_ACCESO.md)
- [Modelo de datos](docs/MODELO_DATOS.md)
- [Arquitectura y puntos de extensión](docs/ARQUITECTURA.md)
- [Pruebas](docs/PRUEBAS.md)
- [Estado del proyecto y pendientes](docs/ESTADO.md)

## Scripts
| Script | Descripción |
|---|---|
| `npm run dev` / `build` | Desarrollo / exportación estática en `out/` |
| `npm run typecheck` · `lint` · `test` · `test:rules` | Calidad y pruebas |
| `npm run deploy:rules` | Publica reglas e índices de Firestore |
| `npm run deploy:hosting` | Compila y publica en Firebase Hosting |
| `node scripts/bootstrap-admin.mjs` | Alta controlada de administradores (Admin SDK, local) |
