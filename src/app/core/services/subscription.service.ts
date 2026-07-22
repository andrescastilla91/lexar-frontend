import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancelSubscriptionResponse,
  CheckoutLinkResponse,
  CreateCheckoutRequest,
  Entitlements,
  EntitlementsResponse,
  PlanCatalogEntry,
  PlanCatalogResponse,
} from '../models/subscription-backend.model';

/**
 * Entitlements del tenant actual (F7). Cacheado en memoria igual que
 * `CatalogsService` (F25) — se invalida tras checkout/cancelación o cuando
 * una acción del usuario cambia el uso medido (altas de usuario, procesos,
 * archivos), para que la próxima lectura refleje el estado real.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/subscription`;

  private cache: Observable<Entitlements> | null = null;

  getEntitlements(): Observable<Entitlements> {
    if (this.cache) {
      return this.cache;
    }

    const request$ = this.http.get<EntitlementsResponse>(this.apiUrl).pipe(
      map((response) => response.entitlements),
      catchError((error) => {
        this.cache = null;
        console.error('Error al obtener la suscripción:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar la suscripción'));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.cache = request$;
    return request$;
  }

  getPlanCatalog(): Observable<PlanCatalogEntry[]> {
    return this.http.get<PlanCatalogResponse>(`${this.apiUrl}/plans`).pipe(
      map((response) => response.plans),
      catchError((error) => {
        console.error('Error al obtener el catálogo de planes:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar los planes'));
      })
    );
  }

  createCheckout(data: CreateCheckoutRequest): Observable<CheckoutLinkResponse['checkout']> {
    return this.http.post<CheckoutLinkResponse>(`${this.apiUrl}/checkout`, data).pipe(
      map((response) => response.checkout),
      catchError((error) => {
        console.error('Error al iniciar el checkout:', error);
        return throwError(() => new Error(error.error?.message || 'Error al iniciar el pago'));
      })
    );
  }

  cancelAtPeriodEnd(): Observable<CancelSubscriptionResponse> {
    return this.http.post<CancelSubscriptionResponse>(`${this.apiUrl}/cancel`, {}).pipe(
      tap(() => this.invalidate()),
      catchError((error) => {
        console.error('Error al cancelar la suscripción:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cancelar la suscripción'));
      })
    );
  }

  /** Limpia el caché de entitlements (p. ej. tras volver de un checkout exitoso). */
  invalidate(): void {
    this.cache = null;
  }
}
