import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancelSubscriptionResponse,
  CheckoutLinkResponse,
  CreateCheckoutRequest,
  Entitlements,
  EntitlementsResponse,
  InvoiceDownloadResponse,
  PlanCatalogEntry,
  PlanCatalogResponse,
  SaasInvoice,
  SaasInvoicesResponse,
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

  private entitlementsCache: Observable<EntitlementsResponse> | null = null;

  getEntitlements(): Observable<Entitlements> {
    return this.entitlementsResponse().pipe(map((response) => response.entitlements));
  }

  isSimulationEnabled(): Observable<boolean> {
    return this.entitlementsResponse().pipe(map((response) => response.simulationEnabled));
  }

  private entitlementsResponse(): Observable<EntitlementsResponse> {
    if (this.entitlementsCache) {
      return this.entitlementsCache;
    }

    const request$ = this.http.get<EntitlementsResponse>(this.apiUrl).pipe(
      catchError((error) => {
        this.entitlementsCache = null;
        console.error('Error al obtener la suscripción:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar la suscripción'));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.entitlementsCache = request$;
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

  /** Encadena checkout + simulate APPROVED — solo disponible cuando `simulationEnabled` es true. */
  simulateSubscription(planCode: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Observable<{ message: string }> {
    return this.createCheckout({ planCode, billingCycle }).pipe(
      switchMap((checkout) =>
        this.http.post<{ message: string }>(`${this.apiUrl}/simulate`, {
          reference: checkout.reference,
          status: 'APPROVED',
        })
      ),
      tap(() => this.invalidate()),
      catchError((error) => {
        console.error('Error al simular la suscripción:', error);
        return throwError(() => new Error(error.error?.message || 'No se pudo simular la suscripción'));
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
    this.entitlementsCache = null;
  }

  listInvoices(): Observable<SaasInvoice[]> {
    return this.http.get<SaasInvoicesResponse>(`${this.apiUrl}/invoices`).pipe(
      map((response) => response.invoices),
      catchError((error) => {
        console.error('Error al obtener las facturas:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar las facturas'));
      })
    );
  }

  downloadInvoice(id: string): Observable<string> {
    return this.http.get<InvoiceDownloadResponse>(`${this.apiUrl}/invoices/${id}/download`).pipe(
      map((response) => response.url),
      catchError((error) => {
        console.error('Error al obtener la descarga de la factura:', error);
        return throwError(() => new Error(error.error?.message || 'Error al descargar la factura'));
      })
    );
  }
}
