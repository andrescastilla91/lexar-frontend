import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary, DashboardSummaryResponse } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/summary`).pipe(
      map((response) => response.summary),
      catchError((error) => {
        console.error('Error al obtener el resumen del tablero:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar el tablero'));
      })
    );
  }
}
