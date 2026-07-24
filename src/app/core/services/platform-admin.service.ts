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

  login(email: string, password: string): Observable<PlatformAdminUser> {
    return this.http
      .post<{ message: string; user: PlatformAdminUser }>(`${this.authUrl}/login`, { email, password })
      .pipe(
        map((response) => response.user),
        tap((user) => this.currentAdminSignal.set(user)),
        catchError((error) => {
          this.currentAdminSignal.set(null);
          return throwError(() => new Error(error.error?.message || 'Credenciales inválidas'));
        })
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
}
