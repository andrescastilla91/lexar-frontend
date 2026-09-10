import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PortalEventVisibilityMode,
  PortalEventVisibilityPolicy,
} from '../models/portal-visibility-policy.model';
import { ProcessEventType } from '../models/process-event.model';

interface PortalVisibilityPolicyListResponse {
  message: string;
  policies: PortalEventVisibilityPolicy[];
}

interface PortalVisibilityPolicyItemResponse {
  message: string;
  policy: PortalEventVisibilityPolicy;
}

/**
 * F27 — política de visibilidad hacia el portal por tipo de evento.
 * GET no requiere permiso especial (se usa también en el historial y el
 * editor de anotaciones, no solo en Configuración) — solo PATCH exige
 * companies.edit, igual que el resto de ajustes de empresa.
 */
@Injectable({ providedIn: 'root' })
export class PortalVisibilityPolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/portal-visibility-policy`;

  getAll(): Observable<PortalEventVisibilityPolicy[]> {
    return this.http.get<PortalVisibilityPolicyListResponse>(this.apiUrl).pipe(
      map((response) => response.policies),
      catchError((error) => {
        console.error('Error al obtener la política de visibilidad del portal:', error);
        return throwError(() => new Error(error.message || 'Error al cargar la política de visibilidad'));
      })
    );
  }

  update(
    eventType: ProcessEventType,
    mode: PortalEventVisibilityMode
  ): Observable<PortalEventVisibilityPolicy> {
    return this.http
      .patch<PortalVisibilityPolicyItemResponse>(`${this.apiUrl}/${eventType}`, { mode })
      .pipe(
        map((response) => response.policy),
        catchError((error) => {
          console.error('Error al actualizar la política de visibilidad del portal:', error);
          return throwError(() => new Error(error.message || 'Error al actualizar la política'));
        })
      );
  }
}
