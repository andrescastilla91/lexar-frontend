import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PortalAcceptInvitationRequest,
  PortalForgotPasswordRequest,
  PortalLoginRequest,
  PortalLoginResponse,
  PortalMessageResponse,
  PortalResetPasswordRequest,
  PortalUser,
} from '../models/portal.model';

export interface PortalLoginOutcome {
  success: boolean;
  message?: string;
  user?: PortalUser;
}

/**
 * F16: equivalente de AuthService pero para el portal de cliente — actor
 * completamente separado (sin roles/permisos), consume solo `/portal/auth/*`.
 * Nunca comparte estado con AuthService/PlatformAdminService.
 */
@Injectable({ providedIn: 'root' })
export class PortalAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/portal/auth`;

  private readonly currentPortalUserSignal = signal<PortalUser | null>(null);
  readonly currentPortalUser = computed(() => this.currentPortalUserSignal());
  readonly isAuthenticated = computed(() => this.currentPortalUserSignal() !== null);

  login(email: string, password: string): Observable<PortalLoginOutcome> {
    const payload: PortalLoginRequest = { email, password };

    return this.http.post<PortalLoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => this.currentPortalUserSignal.set(response.user)),
      map((response) => ({ success: true, user: response.user })),
      catchError((error) => {
        console.error('Error en login de portal:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.',
        });
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.currentPortalUserSignal.set(null)),
      map(() => void 0),
      catchError(() => {
        this.currentPortalUserSignal.set(null);
        return of(void 0);
      })
    );
  }

  /** Usado en el bootstrap (APP_INITIALIZER) para sobrevivir a un reload. */
  getProfile(): Observable<PortalUser | null> {
    return this.http.get<PortalUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => this.currentPortalUserSignal.set(user)),
      catchError(() => {
        this.currentPortalUserSignal.set(null);
        return of(null);
      })
    );
  }

  refreshToken(): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/refresh`, {}).pipe(
      switchMap(() =>
        this.getProfile().pipe(map((user) => user !== null))
      ),
      catchError((error) => {
        console.error('Error al refrescar sesión de portal:', error);
        this.currentPortalUserSignal.set(null);
        return of(false);
      })
    );
  }

  acceptInvitation(token: string, password: string): Observable<{ success: boolean; message?: string }> {
    const payload: PortalAcceptInvitationRequest = { token, password };

    return this.http.post<PortalMessageResponse>(`${this.apiUrl}/accept-invitation`, payload).pipe(
      switchMap(() => this.getProfile().pipe(map((user) => ({ success: user !== null })))),
      catchError((error) => {
        console.error('Error en accept-invitation de portal:', error);
        return of({
          success: false,
          message: error.error?.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo al despacho.',
        });
      })
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message?: string }> {
    const payload: PortalForgotPasswordRequest = { email };

    return this.http.post<PortalMessageResponse>(`${this.apiUrl}/forgot-password`, payload).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error en forgot-password de portal:', error);
        return of({
          success: false,
          message: error.error?.message || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.',
        });
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    const payload: PortalResetPasswordRequest = { token, newPassword };

    return this.http.post<PortalMessageResponse>(`${this.apiUrl}/reset-password`, payload).pipe(
      map((response) => ({ success: true, message: response.message })),
      catchError((error) => {
        console.error('Error en reset-password de portal:', error);
        return of({
          success: false,
          message: error.error?.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
        });
      })
    );
  }

  clearSession(): void {
    this.currentPortalUserSignal.set(null);
  }
}
