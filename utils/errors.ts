/** Traduce errores de Firebase u otros a mensajes comprensibles en español. */
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/user-disabled": "Esta cuenta está desactivada.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  "auth/email-already-in-use": "Ya existe una cuenta con este correo. Inicia sesión para activarla.",
  "auth/weak-password": "La contraseña es demasiado débil (mínimo 8 caracteres).",
  "auth/network-request-failed": "Sin conexión. Comprueba tu red.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión antes de continuar.",
  "permission-denied": "No tienes permisos para realizar esta operación.",
  unavailable: "El servicio no está disponible. Comprueba tu conexión.",
  "not-found": "El elemento solicitado no existe.",
  "failed-precondition": "La operación no se puede completar en el estado actual (puede faltar un índice de Firestore).",
  "resource-exhausted": "Se ha alcanzado la cuota gratuita diaria de Firebase. Inténtalo más tarde.",
  aborted: "La operación entró en conflicto con otro cambio. Vuelve a intentarlo.",
};

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "app/error",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") {
      const clean = code.replace(/^firestore\//, "");
      const msg = MESSAGES[code] ?? MESSAGES[clean];
      if (msg) return msg;
    }
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0 && message.length < 200) return message;
  }
  return "Se ha producido un error inesperado.";
}
