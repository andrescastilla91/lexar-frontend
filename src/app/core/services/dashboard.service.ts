import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardSummary,
  DashboardSummaryResponse,
  OnboardingChecklist,
  OnboardingChecklistResponse,
} from '../models/dashboard.model';

// BUG-20 ola 2: lee error.message — no error.error?.message — ver el
// comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/summary`).pipe(
      map((response) => response.summary),
      catchError((error) => {
        console.error('Error al obtener el resumen del tablero:', error);
        return throwError(() => new Error(error.message || 'Error al cargar el tablero'));
      })
    );
  }

  /**
   * F10: checklist "Primeros pasos" calculado a partir de datos reales del
   * tenant. BUG-11: null si quien lo pide no es el dueño de la empresa —
   * la card no aplica a usuarios invitados.
   */
  getOnboardingChecklist(): Observable<OnboardingChecklist | null> {
    return this.http.get<OnboardingChecklistResponse>(`${this.apiUrl}/onboarding-checklist`).pipe(
      map((response) => response.checklist),
      catchError((error) => {
        console.error('Error al obtener el checklist de primeros pasos:', error);
        return throwError(() => new Error(error.message || 'Error al cargar el checklist'));
      })
    );
  }
}
