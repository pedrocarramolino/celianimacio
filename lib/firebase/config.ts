import type { FirebaseOptions } from "firebase/app";

/**
 * Configuración PÚBLICA del SDK web de Firebase.
 * Estos valores (apiKey, projectId...) NO son secretos: identifican el proyecto y se envían
 * siempre al navegador. La seguridad la imponen Firebase Authentication y firestore.rules.
 * Nunca pongas aquí credenciales del Admin SDK ni ninguna otra clave privada.
 */
export function getFirebaseConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  const missing = Object.entries(config)
    .filter(([key, v]) => key !== "messagingSenderId" && !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Falta configuración de Firebase (${missing.join(", ")}). Copia .env.example a .env.local y rellénalo.`,
    );
  }
  return config;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
}

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
