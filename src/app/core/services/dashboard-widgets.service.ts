import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardWidgetCatalogItem,
  DashboardWidgetCompanySetting,
  DashboardWidgetCompanySettingsResponse,
  DashboardWidgetsResponse,
  SaveDashboardLayoutResponse,
} from '../models/dashboard-widgets.model';

/**
 * F32 PR2 — catálogo efectivo de widgets del dashboard y layout del
 * usuario actual. `saveLayout`/`getCompanySettings`/`updateCompanySettings`
 * no tienen consumidor todavía (llegan con la pantalla de configuración de
 * PR3) pero ya quedan probados aquí para no tener que retocar el servicio
 * cuando se conecten a la UI.
 */
@Injectable({ providedIn: 'root' })
export class DashboardWidgetsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard/widgets`;

  getWidgets(): Observable<{ catalog: DashboardWidgetCatalogItem[]; layout: string[] }> {
    return this.http.get<DashboardWidgetsResponse>(this.apiUrl).pipe(
      map((response) => ({ catalog: response.catalog, layout: response.layout })),
      catchError((error) => {
        console.error('Error al obtener los widgets del tablero:', error);
        return throwError(() => new Error(error.message || 'Error al cargar los widgets del tablero'));
      }),
    );
  }

  saveLayout(widgetKeys: string[]): Observable<string[]> {
    return this.http.put<SaveDashboardLayoutResponse>(`${this.apiUrl}/layout`, { widgetKeys }).pipe(
      map((response) => response.layout),
      catchError((error) => {
        console.error('Error al guardar el layout del tablero:', error);
        return throwError(() => new Error(error.message || 'Error al guardar el layout del tablero'));
      }),
    );
  }

  getCompanySettings(): Observable<DashboardWidgetCompanySetting[]> {
    return this.http.get<DashboardWidgetCompanySettingsResponse>(`${this.apiUrl}/company-settings`).pipe(
      map((response) => response.settings),
      catchError((error) => {
        console.error('Error al obtener la configuración de widgets de la empresa:', error);
        return throwError(() => new Error(error.message || 'Error al cargar la configuración de widgets'));
      }),
    );
  }

  updateCompanySettings(
    settings: { widgetKey: string; enabled: boolean }[],
  ): Observable<DashboardWidgetCompanySetting[]> {
    return this.http
      .patch<DashboardWidgetCompanySettingsResponse>(`${this.apiUrl}/company-settings`, { settings })
      .pipe(
        map((response) => response.settings),
        catchError((error) => {
          console.error('Error al actualizar la configuración de widgets de la empresa:', error);
          return throwError(() => new Error(error.message || 'Error al actualizar la configuración de widgets'));
        }),
      );
  }
}
