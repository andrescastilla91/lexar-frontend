import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterCompanyRequest,
  RegisterResponse,
  AuthUser,
  ProfileResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Solo mantener en memoria (signal), NO en localStorage
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  login(email: string, password: string): Observable<{ success: boolean; message?: string; user?: AuthUser }> {
    const payload: LoginRequest = { email, password };
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => {
        // Guardar usuario en estado en memoria (NO localStorage)
        this.currentUserSignal.set(response.user);
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
        };
        this.currentUserSignal.set(user);
      }),
      map((profile) => ({
        email: profile.email,
        roles: profile.roles,
        permissions: profile.permissions || [],
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

  private clearSession(): void {
    this.currentUserSignal.set(null);
    // NO usar localStorage para datos sensibles
  }
}
