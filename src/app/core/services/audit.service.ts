import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuditLogFilters, AuditLogListResponse } from '../models/audit-log.model';

function buildParams(filters: AuditLogFilters, extra: Record<string, string> = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, value);
    }
  }
  return params;
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/audit-logs`;

  findAll(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Observable<AuditLogListResponse> {
    const params = buildParams(filters, {
      page: String(page),
      limit: String(limit),
    });
    return this.http.get<AuditLogListResponse>(this.apiUrl, { params });
  }

  /**
   * F43 §3: descarga el CSV como blob (no un `<a href>` directo al
   * endpoint) porque el filtrado puede exceder el tope exportable
   * (`AUDIT_EXPORT_MAX_ROWS`, backend) y en ese caso la API responde 400
   * con un mensaje — solo pasando por HttpClient se puede leer ese cuerpo
   * de error y mostrarlo, en vez de que el navegador falle una navegación
   * silenciosamente. Angular entrega el cuerpo de un error también como
   * Blob cuando `responseType: 'blob'` — `readErrorMessage` lo relee como
   * texto/JSON para recuperar el mensaje real.
   */
  exportCsv(filters: AuditLogFilters): Observable<Blob> {
    const params = buildParams(filters);
    return this.http
      .get(`${this.apiUrl}/export`, { params, responseType: 'blob' })
      .pipe(catchError((err: HttpErrorResponse) => readErrorMessage(err)));
  }
}

function readErrorMessage(err: HttpErrorResponse): Observable<never> {
  if (!(err.error instanceof Blob)) {
    return throwError(() => err);
  }
  return new Observable<never>((subscriber) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { message?: string };
        subscriber.error(new Error(parsed.message ?? 'No se pudo exportar la auditoría'));
      } catch {
        subscriber.error(new Error('No se pudo exportar la auditoría'));
      }
    };
    reader.onerror = () => {
      subscriber.error(new Error('No se pudo exportar la auditoría'));
    };
    reader.readAsText(err.error);
  });
}
