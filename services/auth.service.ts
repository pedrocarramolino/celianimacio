import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AuditRepository, InvitationRepository, UserRepository } from "@/repositories/contracts";
import { USER_ROLES, type AuthSession, type Invitation, type UserRole } from "@/types";
import { AppError } from "@/utils/errors";

/**
 * AuthService: único punto que conoce Firebase Authentication.
 *
 * Resolución de rol (compatible con futuros custom claims):
 *  1. Si el token incluye el claim `role` (establecido con Admin SDK), se usa ese valor.
 *  2. Si no, se usa users/{uid}.role, que solo un administrador puede modificar (firestore.rules).
 * El cliente NUNCA decide su rol: lo lee de una fuente protegida.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly invitations: InvitationRepository,
    private readonly audit: AuditRepository,
  ) {}

  onSessionChange(callback: (session: AuthSession | null) => void, onError: (e: unknown) => void): () => void {
    return onIdTokenChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        callback(null);
        return;
      }
      this.resolveSession(user).then(callback, onError);
    });
  }

  async resolveSession(user: User): Promise<AuthSession> {
    const token = await user.getIdTokenResult();
    const claim = token.claims.role;
    const claimRole = typeof claim === "string" && (USER_ROLES as readonly string[]).includes(claim) ? (claim as UserRole) : null;
    const profile = await this.users.getById(user.uid);
    const docRole = profile && profile.active ? profile.role : null;
    return {
      uid: user.uid,
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      role: claimRole ?? docRole,
      roleSource: claimRole ? "claims" : docRole ? "document" : "none",
      profile,
    };
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  }

  async signOut(): Promise<void> {
    await signOut(getFirebaseAuth());
  }

  async sendPasswordReset(email: string): Promise<void> {
    const url = typeof window !== "undefined" ? `${window.location.origin}/login/` : undefined;
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim(), url ? { url } : undefined);
  }

  /**
   * Alta de la cuenta del propio trabajador invitado. Es un registro normal de Firebase Auth
   * (no privilegiado): la cuenta no tiene ningún permiso hasta que se activa con una
   * invitación pendiente para ese email verificado.
   */
  async registerInvitedAccount(email: string, password: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    await sendEmailVerification(cred.user, { url: `${window.location.origin}/activar/` });
  }

  async resendVerification(): Promise<void> {
    const user = this.requireUser();
    await sendEmailVerification(user, { url: `${window.location.origin}/activar/` });
  }

  /** Recarga el usuario y fuerza un token nuevo (necesario tras verificar el email). */
  async refresh(): Promise<{ emailVerified: boolean }> {
    const user = this.requireUser();
    await reload(user);
    await user.getIdToken(true);
    return { emailVerified: user.emailVerified };
  }

  async findMyInvitation(): Promise<Invitation | null> {
    const user = this.requireUser();
    if (!user.email) return null;
    // Tras verificar el email, el token en uso puede no incluir aún email_verified=true
    // (las reglas lo exigen). Se fuerza un token nuevo antes de consultar.
    const token = await user.getIdTokenResult();
    if (token.claims.email_verified !== true) {
      await reload(user);
      if (user.emailVerified) await user.getIdToken(true);
    }
    return this.invitations.getByEmail(user.email.toLowerCase());
  }

  async activateInvitation(): Promise<void> {
    const user = this.requireUser();
    if (!user.emailVerified) throw new AppError("Primero debes verificar tu correo electrónico.");
    const invitation = await this.findMyInvitation();
    if (!invitation || invitation.status !== "pending") {
      throw new AppError("No hay ninguna invitación pendiente para este correo. Contacta con la empresa.");
    }
    const existing = await this.users.getById(user.uid);
    if (existing) throw new AppError("Tu cuenta ya está activada.");
    await this.invitations.accept({
      uid: user.uid,
      email: user.email ?? invitation.email,
      displayName: invitation.displayName || invitation.email,
      invitation,
    });
    await this.audit
      .log({ action: "account.activated", entityType: "user", entityId: user.uid, summary: `Activación de ${invitation.email}` }, { uid: user.uid })
      .catch(() => undefined);
    await user.getIdToken(true);
  }

  currentUser(): User | null {
    return getFirebaseAuth().currentUser;
  }

  private requireUser(): User {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new AppError("Debes iniciar sesión.");
    return user;
  }
}
