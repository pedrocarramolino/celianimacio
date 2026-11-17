# Roles, alta de administradores e invitaciones

## Roles
| Rol | Dónde se guarda | Quién lo puede cambiar |
|---|---|---|
| `admin` | `users/{uid}.role` (o custom claim `role`) | Otro administrador, el script de arranque o la consola de Firebase |
| `worker` | `users/{uid}.role` | Se asigna automáticamente al activar una invitación; solo un admin puede cambiarlo |

**Rol efectivo** (`firestore.rules` → `isAdmin()` y `AuthService.resolveSession`):
1. Si el token tiene el custom claim `role`, se usa.
2. Si no, `users/{uid}.role`, siempre que `active == true`.

Un usuario **nunca** puede escribir su propio rol: las reglas solo le permiten cambiar `displayName` de su perfil, y solo puede crearlo con `role: "worker"` y una invitación válida.

## Alta del primer administrador (procedimiento controlado)
No existe registro público de administradores. Elige **una** de estas opciones:

### Opción A — Consola de Firebase (sin instalar nada)
1. Consola → **Authentication → Users → Add user**: crea el usuario con email y contraseña. Copia su **UID**.
2. Consola → **Firestore Database → Iniciar colección** `users`, ID de documento = **UID**, con los campos:
   | campo | tipo | valor |
   |---|---|---|
   | email | string | el correo |
   | displayName | string | nombre |
   | role | string | `admin` |
   | employeeId | null | — |
   | active | boolean | true |
   | createdAt | timestamp | ahora |
   | updatedAt | timestamp | ahora |
   | createdBy | string | el UID |
3. Inicia sesión en la app.

La consola escribe con privilegios de propietario (las reglas no la limitan), por eso es un canal seguro.

### Opción B — Script con Admin SDK (recomendado)
Funciona en Spark: el Admin SDK habla directamente con Auth/Firestore desde tu ordenador.
1. Consola → Configuración del proyecto → **Cuentas de servicio** → *Generar nueva clave privada*. Guarda el JSON **fuera del repositorio** (está en `.gitignore`).
2. Ejecuta:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
   node scripts/bootstrap-admin.mjs --project TU_PROYECTO --email admin@empresa.com --name "Nombre Apellido" --password "ContraseñaSegura"
   ```
   Añade `--claims` para establecer también el custom claim `role=admin`.
3. **Borra el JSON** de la cuenta de servicio (o revoca la clave) cuando termines.

Nunca pongas la cuenta de servicio en variables `NEXT_PUBLIC_*` ni en el código de la app.

## Más administradores
Desde **Configuración → Usuarios y roles**, un admin puede cambiar el rol de cualquier usuario existente (p. ej., promover a un trabajador ya activado). No puede retirarse su propio rol ni desactivarse a sí mismo.

## Invitar trabajadores (compatible con Spark)
1. Admin → **Trabajadores → Nuevo** con "Crear invitación de acceso" marcado. Se crean `employees/{id}` e `invitations/{email}` en un lote.
2. Comparte con el trabajador el enlace `https://TU-DOMINIO/activar/` (botones *Copiar mensaje* / *Abrir en mi correo* en la pestaña **Acceso** de la ficha).
3. El trabajador crea su cuenta con **ese mismo correo** y lo verifica con el enlace que envía Firebase.
4. Con el email verificado pulsa **Activar mi cuenta**: en un lote atómico se crea `users/{uid}` (rol `worker`), se vincula `employees/{id}.userId` y la invitación pasa a `accepted`. Las reglas exigen email verificado + invitación pendiente + misma ficha.

¿Por qué email verificado? Sin él, alguien que conociera el correo invitado podría registrarse antes que el trabajador real.

## Desactivar accesos
- **Trabajador inactivo** (ficha → Acceso → Marcar como inactivo): pone `users/{uid}.active = false`; las reglas le niegan todo acceso a datos.
- Para bloquear también el inicio de sesión, deshabilita la cuenta en Consola → Authentication.

## Migrar a custom claims
Cuando exista backend (o con el script `--claims`), el rol puede viajar en el token: menos lecturas en reglas y sin depender del documento. Ten en cuenta que entonces **ambas fuentes deben mantenerse coherentes** (un claim `admin` prevalece aunque el documento diga otra cosa). Los cambios de claims se aplican cuando el usuario renueva su token (máx. 1 h o al volver a iniciar sesión).
