import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ClientAuthorizationsFilters,
  ClientAuthorizationsListResponse,
  LegalAcceptancesFilters,
  LegalAcceptancesListResponse,
} from '../models/legal-compliance.model';
import { readBlobErrorMessage } from '../utils/blob-download.util';

function buildParams(filters: object, extra: Record<string, string> = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * F44 §LEG-04 (ola 5): registro consultable y exportable de aceptaciones de
 * términos y de autorizaciones de tratamiento de datos. La exportación baja
 * como blob (no `<a href>`) para poder leer el 400 del tope de filas.
 */
@Injectable({
  providedIn: 'root',
})
export class LegalComplianceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/legal-compliance`;

  findAcceptances(
    filters: LegalAcceptancesFilters,
    page: number,
    limit: number,
  ): Observable<LegalAcceptancesListResponse> {
    const params = buildParams(filters, { page: String(page), limit: String(limit) });
    return this.http.get<LegalAcceptancesListResponse>(`${this.apiUrl}/acceptances`, { params });
  }

  exportAcceptances(filters: LegalAcceptancesFilters): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/acceptances/export`, { params: buildParams(filters), responseType: 'blob' })
      .pipe(
        catchError((err: HttpErrorResponse) =>
          readBlobErrorMessage(err, 'No se pudo exportar el registro de aceptaciones'),
        ),
      );
  }

  findClientAuthorizations(
    filters: ClientAuthorizationsFilters,
    page: number,
    limit: number,
  ): Observable<ClientAuthorizationsListResponse> {
    const params = buildParams(filters, { page: String(page), limit: String(limit) });
    return this.http.get<ClientAuthorizationsListResponse>(`${this.apiUrl}/client-authorizations`, {
      params,
    });
  }

  exportClientAuthorizations(filters: ClientAuthorizationsFilters): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/client-authorizations/export`, {
        params: buildParams(filters),
        responseType: 'blob',
      })
      .pipe(
        catchError((err: HttpErrorResponse) =>
          readBlobErrorMessage(err, 'No se pudo exportar el registro de autorizaciones'),
        ),
      );
  }
}
