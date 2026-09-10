import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemeService } from './theme.service';
import { ProfileService } from './profile.service';
import { CatalogsService } from './catalogs.service';
import { SubscriptionService } from './subscription.service';
import {
  LoginRequest,
  LoginResponse,
  RegisterCompanyRequest,
  RegisterResponse,
  AuthUser,
  ProfileResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AcceptInvitationRequest,
  MessageResponse,
  VerifyEmailRequest,
  TwoFactorLoginRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorDisableRequest,
  TwoFactorRecoveryCodesRegenerateRequest,
  TwoFactorRecoveryCodesRegenerateResponse,
  ForgotTwoFactorRequest,
} from '../models/auth.model';

export interface LoginOutcome {
  success: boolean;
  message?: string;
  user?: AuthUser;
  /** F11 (S10): si viene en true, el login no abrió sesión — hay que completar el segundo paso con pendingToken. */
  requires2fa?: boolean;
  pendingToken?: string;
}

// BUG-20 ola 2: los `message:` armados abajo leen error.message — no
// error.error?.message — ver el comentario en deadlines.service.ts.
// Excepción: login() y loginWithTwoFactor() sí leen error.error?.message,
// porque ahí el fallo esperado es 401 y error.interceptor.ts ignora ese
// status a propósito (ver el comentario dentro de login()).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly profileService = inject(ProfileService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Solo mantener en memoria (signal), NO en localStorage
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  login(email: string, password: string): Observable<LoginOutcome> {
    const payload: LoginRequest = { email, password };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      map((response) => {
        if (response.requires2fa) {
          // F11 (S10): aún no hay sesión — el componente de login debe pedir el código.
          return {
            success: true,
            requires2fa: true,
            pendingToken: response.pendingToken,
            message: response.message,
          };
        }
        this.completeLogin(response.user!);
        return { success: true, requires2fa: false, user: response.user };
      }),
      catchError((error) => {
        console.error('Error en login:', error);
        // BUG-20 (excepción, hallazgo 2026-09-01): error.interceptor.ts
        // ignora a propósito todo 401 (línea `if (error.status === 401)
        // return throwError(() => error)`, para que auth.interceptor.ts
        // pueda intentar refrescar el token) — así que aquí NUNCA llega el
        // objeto {message, statusCode, error} que arma el interceptor, sino
        // el HttpErrorResponse crudo de Angular. error.message en ese caso
        // es un texto genérico en inglés ("Http failure response for...");
        // el mensaje real del backend (p. ej. "Credenciales inválidas")
        // solo está en error.error?.message. Un login fallido es
        // prácticamente siempre un 401, así que se lee de ahí — no aplica
        // la regla general de BUG-20 de leer siempre error.message.
        return of({
          success: false,
          message: error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.', // bug20-401-ok
        });
      })
    );
  }

  /** F11 (S10): segundo paso del login cuando el usuario tiene 2FA activo. */
  loginWithTwoFactor(pendingToken: string, code: string): Observable<LoginOutcome> {
    const payload: TwoFactorLoginRequest = { pendingToken, code };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login/2fa`, payload).pipe(
      map((response) => {
        this.completeLogin(response.user!);
        return { success: true, user: response.user };
      }),
      catchError((error) => {
        console.error('Error en login/2fa:', error);
        // BUG-20 (excepción 401): mismo caso que login() arriba — código
        // incorrecto en el segundo paso del login también responde 401, que
        // error.interceptor.ts deja pasar crudo.
        return of({
          success: false,
          message: error.error?.message || 'El código ingresado no es válido.', // bug20-401-ok
        });
      })
    );
  }

  /** F11 (S10): inicia el enrolamiento — genera el secreto y el QR, aún no activa el 2FA. */
  setupTwoFactor(): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(`${this.apiUrl}/2fa/setup`, {});
  }

  /** F11 (S10): confirma el primer código y activa el 2FA — devuelve los códigos de recuperación una sola vez. */
  verifyTwoFactor(code: string): Observable<TwoFactorVerifyResponse> {
    const payload: TwoFactorVerifyRequest = { code };
    return this.http.post<TwoFactorVerifyResponse>(`${this.apiUrl}/2fa/verify`, payload).pipe(
      tap(() => this.patchCurrentUser({ twoFactorEnabled: true })),
    );
  }

  /** F11 (S10): autodesactivación — exige contraseña + código vigente. */
  disableTwoFactor(password: string, code: string): Observable<MessageResponse> {
    const payload: TwoFactorDisableRequest = { password, code };
    return this.http.post<MessageResponse>(`${this.apiUrl}/2fa/disable`, payload).pipe(
      tap(() => this.patchCurrentUser({ twoFactorEnabled: false })),
    );
  }

  /** Regenera los códigos de recuperación sin desactivar el 2FA — invalida los anteriores. */
  regenerateTwoFactorRecoveryCodes(password: string, code: string): Observable<TwoFactorRecoveryCodesRegenerateResponse> {
    const payload: TwoFactorRecoveryCodesRegenerateRequest = { password, code };
    return this.http.post<TwoFactorRecoveryCodesRegenerateResponse>(
      `${this.apiUrl}/2fa/recovery-codes/regenerate`,
      payload,
    );
  }

  /**
   * Solicitud de restablecimiento de 2FA — respuesta ciega (no revela si el
   * correo existe ni si tiene 2FA activo). Delta 2026-07-27: ya no completa
   * nada por sí sola, solo notifica al usuario y a los admins del tenant con
   * `users.manage-2fa`; es el admin quien ejecuta el restablecimiento desde
   * la tabla de usuarios tras verificar identidad fuera de banda.
   */
  forgotTwoFactor(email: string): Observable<{ success: boolean; message?: string }> {
    const payload: ForgotTwoFactorRequest = { email };

    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-2fa`, payload).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error en forgot-2fa:', error);
        return of({
          success: false,
          message: error.message || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.',
        });
      })
    );
  }

  register(data: RegisterCompanyRequest): Observable<{ success: boolean; message?: string; user?: AuthUser }> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
        this.clearTenantCaches();
        // Guardar usuario en estado en memoria (NO localStorage)
        this.currentUserSignal.set(response.user);
      }),
      map((response) => ({
        success: true,
        message: response.message,
        user: response.user,
      })),
      catchError((error) => {
        console.error('Error en registro:', error);
        return of({
          success: false,
          message: error.message || 'Error al registrar la empresa. Intenta nuevamente.',
        });
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('Error en logout:', error);
        // Limpiar sesión aunque falle el logout en backend
        this.clearSession();
        return of(void 0);
      })
    );
  }

  getProfile(): Observable<AuthUser | null> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/me`).pipe(
      tap((profile) => {
        const user: AuthUser = {
          email: profile.email,
          roles: profile.roles,
          permissions: profile.permissions || [],
          themePreference: profile.themePreference,
          impersonating: profile.impersonating,
          emailVerified: profile.emailVerified,
          isOwner: profile.isOwner,
          twoFactorEnabled: profile.twoFactorEnabled,
          companyRequire2fa: profile.companyRequire2fa,
        };
        this.currentUserSignal.set(user);
        if (profile.themePreference) {
          this.themeService.setPreference(profile.themePreference);
        }
        this.enrichCurrentUserWithProfile();
      }),
      map((profile) => ({
        email: profile.email,
        roles: profile.roles,
        permissions: profile.permissions || [],
        themePreference: profile.themePreference,
        impersonating: profile.impersonating,
        emailVerified: profile.emailVerified,
        isOwner: profile.isOwner,
        twoFactorEnabled: profile.twoFactorEnabled,
        companyRequire2fa: profile.companyRequire2fa,
      })),
      catchError((error) => {
        console.error('Error al obtener perfil:', error);
        this.clearSession();
        return of(null);
      })
    );
  }

  /** F10: verifica el correo del usuario a partir del token recibido por email. */
  verifyEmail(token: string): Observable<{ success: boolean; message?: string }> {
    const payload: VerifyEmailRequest = { token };

    return this.http.post<MessageResponse>(`${this.apiUrl}/verify-email`, payload).pipe(
      tap(() => this.patchCurrentUser({ emailVerified: true })),
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error al verificar el correo:', error);
        return of({
          success: false,
          message: error.message || 'El enlace no es válido o ya expiró.',
        });
      })
    );
  }

  /** F10: reenvía el correo de verificación al usuario autenticado actual. */
  resendVerification(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/resend-verification`, {}).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error al reenviar la verificación:', error);
        return of({
          success: false,
          message: error.message || 'No se pudo reenviar el correo de verificación.',
        });
      })
    );
  }

  refreshToken(): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/refresh`, {}).pipe(
      switchMap(() => {
        return this.getProfile().pipe(
          map((user) => {
            if (user) {
              return true;
            }
            console.error('❌ No se pudo obtener el perfil después del refresh');
            return false;
          })
        );
      }),
      catchError((error) => {
        console.error('❌ Error al refrescar token:', error);
        this.clearSession();
        return of(false);
      })
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message?: string }> {
    const payload: ForgotPasswordRequest = { email };

    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, payload).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error en forgot-password:', error);
        return of({
          success: false,
          message: error.message || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.',
        });
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    const payload: ResetPasswordRequest = { token, newPassword };

    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, payload).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error en reset-password:', error);
        return of({
          success: false,
          message: error.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
        });
      })
    );
  }

  acceptInvitation(token: string, password: string): Observable<{ success: boolean; message?: string }> {
    const payload: AcceptInvitationRequest = { token, password };

    return this.http.post<MessageResponse>(`${this.apiUrl}/accept-invitation`, payload).pipe(
      switchMap(() =>
        this.getProfile().pipe(
          map((user) => ({ success: user !== null })),
        ),
      ),
      catchError((error) => {
        console.error('Error en accept-invitation:', error);
        return of({
          success: false,
          message: error.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo al administrador.',
        });
      })
    );
  }

  patchCurrentUser(partial: Partial<AuthUser>): void {
    this.currentUserSignal.update((user) => (user ? { ...user, ...partial } : user));
  }

  /** F9: cierra la sesión de impersonación (no un logout normal). */
  exitImpersonation(): Observable<void> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/exit-impersonation`, {}).pipe(
      tap(() => this.clearSession()),
      map(() => void 0),
      catchError((error) => {
        console.error('Error al salir de la impersonación:', error);
        this.clearSession();
        return of(void 0);
      })
    );
  }

  private completeLogin(user: AuthUser): void {
    this.clearTenantCaches();
    // Guardar usuario en estado en memoria (NO localStorage)
    this.currentUserSignal.set(user);
    if (user.themePreference) {
      this.themeService.setPreference(user.themePreference);
    }
    this.enrichCurrentUserWithProfile();
  }

  private enrichCurrentUserWithProfile(): void {
    this.profileService.getMe().subscribe({
      next: (profile) => {
        this.patchCurrentUser({
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
        });
      },
      error: () => {
        // El header simplemente muestra iniciales por email si esto falla
      },
    });
  }

  private clearSession(): void {
    this.currentUserSignal.set(null);
    this.clearTenantCaches();
    // NO usar localStorage para datos sensibles
  }

  private clearTenantCaches(): void {
    this.catalogsService.invalidateAll();
    this.subscriptionService.invalidate();
  }
}
