"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseConfig, USE_EMULATORS } from "./config";

/**
 * Inicialización perezosa: nada se ejecuta al importar el módulo, de modo que la
 * exportación estática (prerender) no necesita credenciales ni acceso a Firebase.
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Firebase cliente solo puede usarse en el navegador.");
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertBrowser();
  if (!app) app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    auth.languageCode = "es";
    void setPersistence(auth, browserLocalPersistence);
    if (USE_EMULATORS) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    try {
      // Caché local persistente: lectura sin conexión y menos lecturas facturables.
      db = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      db = getFirestore(firebaseApp);
    }
    if (USE_EMULATORS) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return db;
}
