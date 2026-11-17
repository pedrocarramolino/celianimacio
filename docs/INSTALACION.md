# Instalación y despliegue (plan Spark, sin tarjeta)

## 1. Requisitos
- Node.js 20+ y npm.
- Una cuenta de Google. **No actives Blaze** ni añadas tarjeta.

## 2. Crear el proyecto Firebase
1. https://console.firebase.google.com → **Añadir proyecto** (Google Analytics opcional). El plan por defecto es **Spark**.
2. **Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña: Habilitar.**
   (Opcional, recomendado) *Configuración → Protección contra la enumeración de correos*: activada.
   En *Plantillas* puedes poner los correos de verificación/recuperación en español.
3. **Firestore Database → Crear base de datos** → modo **producción** → ubicación `eur3` o `europe-west` (no se puede cambiar después).
4. **Configuración del proyecto → General → Tus apps → Web (</>)**: registra la app (no hace falta marcar Hosting aquí). Copia los valores de `firebaseConfig`.

## 3. Configurar el proyecto local
```bash
npm install
```
```bash
cp .env.example .env.local
```
Rellena `.env.local` con los valores del paso 2.4. Son públicos (no secretos); nunca añadas claves privadas.

## 4. Publicar reglas e índices
```bash
npx firebase login
```
```bash
cp .firebaserc.example .firebaserc
```
Edita `.firebaserc` con el ID del proyecto y despliega:
```bash
npm run deploy:rules
```
Los índices tardan unos minutos en construirse; mientras tanto algunas pantallas pueden mostrar "puede faltar un índice".

## 5. Crear el primer administrador
Sigue `docs/ROLES_Y_ACCESO.md` (opción consola o script).

## 6. Probar en local
```bash
npm run dev
```
Abre http://localhost:3000 e inicia sesión. La geolocalización funciona en `localhost`; en otra IP requiere HTTPS.

## 7. Desplegar en Firebase Hosting (Spark)
```bash
npm run deploy:hosting
```
Esto ejecuta `next build` (exportación estática a `out/`) y `firebase deploy --only hosting`. La URL será `https://TU_PROYECTO.web.app`.

Después, en **Authentication → Configuración → Dominios autorizados**, comprueba que aparece tu dominio de Hosting (y añade tu dominio propio si lo usas).

## 7 bis. Alternativa: desplegar en Vercel (plan Hobby gratuito)
La app es estática, así que Vercel la sirve sin funciones de servidor.
1. Importa el repositorio en Vercel (framework detectado: Next.js; `vercel.json` añade las cabeceras de seguridad).
2. En *Settings → Environment Variables* añade las mismas `NEXT_PUBLIC_FIREBASE_*` de `.env.local` (Production y Preview) y vuelve a desplegar: se incrustan al compilar.
3. En Firebase → *Authentication → Configuración → Dominios autorizados* añade el dominio `*.vercel.app` asignado (p. ej. `celianimacio.vercel.app`); sin esto fallan el login y los enlaces de correo.
4. Las reglas e índices se siguen publicando con `npm run deploy:rules`.

## 8. Puesta en marcha
1. Configuración → Empresa: radio por defecto, precisión GPS máxima, margen de fichaje.
2. Configuración → Ubicaciones: guarda los espacios habituales.
3. Trabajadores → crea fichas e invitaciones; envía a cada trabajador el enlace `/activar/`.
4. Eventos → crea el evento y sus turnos → Asignaciones.

## Copias de seguridad
Las exportaciones gestionadas de Firestore requieren Blaze. En Spark, exporta periódicamente los informes CSV y considera un script local con Admin SDK para volcar colecciones a JSON (no incluido).
