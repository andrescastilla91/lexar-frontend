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
} from '../models/auth.model';

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

  login(email: string, password: string): Observable<{ success: boolean; message?: string; user?: AuthUser }> {
    const payload: LoginRequest = { email, password };
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => {
        this.clearTenantCaches();
        // Guardar usuario en estado en memoria (NO localStorage)
        this.currentUserSignal.set(response.user);
        if (response.user.themePreference) {
          this.themeService.setPreference(response.user.themePreference);
        }
        this.enrichCurrentUserWithProfile();
      }),
      map((response) => ({
        success: true,
        user: response.user,
      })),
      catchError((error) => {
        console.error('Error en login:', error);
        return of({
          success: false,
          message: error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.',
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
          message: error.error?.message || 'Error al registrar la empresa. Intenta nuevamente.',
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
      })),
      catchError((error) => {
        console.error('Error al obtener perfil:', error);
        this.clearSession();
        return of(null);
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
          message: error.error?.message || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.',
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
          message: error.error?.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
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
          message: error.error?.message || 'El enlace no es válido o ya expiró. Solicita uno nuevo al administrador.',
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
