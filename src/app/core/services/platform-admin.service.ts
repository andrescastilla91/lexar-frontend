import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminMetrics,
  AdminPlan,
  CreatePlanRequest,
  CreatePlatformAdminRequest,
  PlatformAdminSummary,
  PlatformAdminUser,
  PlatformLoginOutcome,
  PlatformNotificationChannelSetting,
  PlatformNotificationTypeSetting,
  PlatformTwoFactorSetupResponse,
  PlatformTwoFactorVerifySetupResponse,
  TenantDetail,
  TenantSummary,
  UpdatePlanRequest,
  UpdateTenantSubscriptionRequest,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/admin/auth`;
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  private readonly currentAdminSignal = signal<PlatformAdminUser | null>(null);
  readonly currentAdmin = computed(() => this.currentAdminSignal());
  readonly isAuthenticated = computed(() => this.currentAdminSignal() !== null);

  /**
   * F11 (S10): el 2FA es obligatorio sin excepción — este paso NUNCA abre
   * sesión ni recibe cookie por sí solo, solo devuelve un pendingToken.
   * Bug corregido 2026-07-27: antes esto se trataba como login completo
   * (`response.user`), pero el backend nunca devuelve `user` aquí — el
   * panel navegaba como si hubiera sesión sin que existiera la cookie
   * `platform_access_token`, y todo request subsecuente a /admin/* volvía
   * 403 desde PlatformAdminGuard.
   */
  login(email: string, password: string): Observable<PlatformLoginOutcome> {
    return this.http
      .post<PlatformLoginOutcome>(`${this.authUrl}/login`, { email, password })
      .pipe(
        catchError((error) => {
          this.currentAdminSignal.set(null);
          return throwError(() => new Error(error.error?.message || 'Credenciales inválidas'));
        })
      );
  }

  /** Enrolamiento forzado (primer login, aún sin sesión): genera el secreto y el QR. */
  setupTwoFactor(pendingToken: string): Observable<PlatformTwoFactorSetupResponse> {
    return this.http
      .post<PlatformTwoFactorSetupResponse>(`${this.authUrl}/2fa/setup`, { pendingToken })
      .pipe(
        catchError((error) =>
          throwError(() => new Error(error.error?.message || 'No se pudo iniciar la verificación en dos pasos.'))
        )
      );
  }

  /** Confirma el primer código del enrolamiento forzado: aquí sí se abre sesión. */
  verifyTwoFactorSetup(pendingToken: string, code: string): Observable<PlatformTwoFactorVerifySetupResponse> {
    return this.http
      .post<PlatformTwoFactorVerifySetupResponse>(`${this.authUrl}/2fa/verify`, { pendingToken, code })
      .pipe(
        tap((response) => this.currentAdminSignal.set(response.user)),
        catchError((error) =>
          throwError(() => new Error(error.error?.message || 'El código ingresado no es válido.'))
        )
      );
  }

  /** Segundo paso del login recurrente (2FA ya estaba activo). */
  loginWithTwoFactor(pendingToken: string, code: string): Observable<PlatformAdminUser> {
    return this.http
      .post<{ message: string; user: PlatformAdminUser }>(`${this.authUrl}/login/2fa`, { pendingToken, code })
      .pipe(
        map((response) => response.user),
        tap((user) => this.currentAdminSignal.set(user)),
        catchError((error) =>
          throwError(() => new Error(error.error?.message || 'El código ingresado no es válido.'))
        )
      );
  }

  logout(): Observable<void> {
    return this.http.post(`${this.authUrl}/logout`, {}).pipe(
      map(() => void 0),
      tap(() => this.currentAdminSignal.set(null)),
      catchError(() => {
        this.currentAdminSignal.set(null);
        return of(void 0);
      })
    );
  }

  /** Usado en el bootstrap (APP_INITIALIZER) para sobrevivir a un reload. */
  getProfile(): Observable<PlatformAdminUser | null> {
    return this.http.get<PlatformAdminUser>(`${this.authUrl}/me`).pipe(
      tap((user) => this.currentAdminSignal.set(user)),
      catchError(() => {
        this.currentAdminSignal.set(null);
        return of(null);
      })
    );
  }

  listTenants(): Observable<TenantSummary[]> {
    return this.http.get<{ tenants: TenantSummary[] }>(`${this.apiUrl}/tenants`).pipe(
      map((response) => response.tenants),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar los tenants')))
    );
  }

  getTenant(id: string): Observable<TenantDetail> {
    return this.http.get<{ tenant: TenantDetail }>(`${this.apiUrl}/tenants/${id}`).pipe(
      map((response) => response.tenant),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar el tenant')))
    );
  }

  updateSubscription(id: string, dto: UpdateTenantSubscriptionRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/tenants/${id}/subscription`, dto).pipe(
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar la suscripción')))
    );
  }

  impersonate(companyId: string, userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/tenants/${companyId}/impersonate/${userId}`, {}).pipe(
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo iniciar la impersonación')))
    );
  }

  listPlans(): Observable<AdminPlan[]> {
    return this.http.get<{ plans: AdminPlan[] }>(`${this.apiUrl}/plans`).pipe(
      map((response) => response.plans),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar los planes')))
    );
  }

  createPlan(dto: CreatePlanRequest): Observable<AdminPlan> {
    return this.http.post<{ plan: AdminPlan }>(`${this.apiUrl}/plans`, dto).pipe(
      map((response) => response.plan),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo crear el plan')))
    );
  }

  updatePlan(id: string, dto: UpdatePlanRequest): Observable<AdminPlan> {
    return this.http.patch<{ plan: AdminPlan }>(`${this.apiUrl}/plans/${id}`, dto).pipe(
      map((response) => response.plan),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar el plan')))
    );
  }

  deactivatePlan(id: string): Observable<AdminPlan> {
    return this.http.delete<{ plan: AdminPlan }>(`${this.apiUrl}/plans/${id}`).pipe(
      map((response) => response.plan),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo desactivar el plan')))
    );
  }

  listPlatformAdmins(): Observable<PlatformAdminSummary[]> {
    return this.http.get<{ platformAdmins: PlatformAdminSummary[] }>(`${this.apiUrl}/platform-admins`).pipe(
      map((response) => response.platformAdmins),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar los platform admins')))
    );
  }

  createPlatformAdmin(dto: CreatePlatformAdminRequest): Observable<PlatformAdminSummary> {
    return this.http.post<{ platformAdmin: PlatformAdminSummary }>(`${this.apiUrl}/platform-admins`, dto).pipe(
      map((response) => response.platformAdmin),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo crear el platform admin')))
    );
  }

  togglePlatformAdminActive(id: string): Observable<PlatformAdminSummary> {
    return this.http.patch<{ platformAdmin: PlatformAdminSummary }>(`${this.apiUrl}/platform-admins/${id}/toggle-active`, {}).pipe(
      map((response) => response.platformAdmin),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar el platform admin')))
    );
  }

  getMetrics(): Observable<AdminMetrics> {
    return this.http.get<{ metrics: AdminMetrics }>(`${this.apiUrl}/metrics`).pipe(
      map((response) => response.metrics),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar las métricas')))
    );
  }

  getNotificationTypes(): Observable<PlatformNotificationTypeSetting[]> {
    return this.http.get<{ types: PlatformNotificationTypeSetting[] }>(`${this.apiUrl}/notifications/types`).pipe(
      map((response) => response.types),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar los tipos de notificación')))
    );
  }

  updateNotificationType(type: string, changes: { enabled?: boolean; label?: string | null }): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/notifications/types`, { settings: [{ type, ...changes }] })
      .pipe(
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar el tipo de notificación')))
      );
  }

  updateNotificationTypeChannel(type: string, channel: string, enabled: boolean): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/notifications/types/channels`, { settings: [{ type, channel, enabled }] })
      .pipe(
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar el canal para este evento')))
      );
  }

  getNotificationChannels(): Observable<PlatformNotificationChannelSetting[]> {
    return this.http.get<{ channels: PlatformNotificationChannelSetting[] }>(`${this.apiUrl}/notifications/channels`).pipe(
      map((response) => response.channels),
      catchError((error) => throwError(() => new Error(error.error?.message || 'Error al cargar los canales de notificación')))
    );
  }

  updateNotificationChannel(channel: string, enabled: boolean): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/notifications/channels`, { settings: [{ channel, enabled }] })
      .pipe(
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo actualizar el canal de notificación')))
      );
  }
}
