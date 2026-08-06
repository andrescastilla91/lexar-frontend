import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PortalDocumentItem,
  PortalDownloadUrlResponse,
  PortalProcessListItem,
  PortalTimelineItem,
} from '../models/portal.model';

@Injectable({ providedIn: 'root' })
export class PortalProcessesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/portal`;

  findProcesses(): Observable<PortalProcessListItem[]> {
    return this.http.get<{ processes: PortalProcessListItem[] }>(`${this.apiUrl}/processes`).pipe(
      map((response) => response.processes),
      catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudieron cargar tus procesos')))
    );
  }

  findTimeline(processId: string): Observable<PortalTimelineItem[]> {
    return this.http
      .get<{ timeline: PortalTimelineItem[] }>(`${this.apiUrl}/processes/${processId}/timeline`)
      .pipe(
        map((response) => response.timeline),
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo cargar la línea de tiempo')))
      );
  }

  findDocuments(processId: string): Observable<PortalDocumentItem[]> {
    return this.http
      .get<{ documents: PortalDocumentItem[] }>(`${this.apiUrl}/processes/${processId}/documents`)
      .pipe(
        map((response) => response.documents),
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudieron cargar los documentos')))
      );
  }

  getDownloadUrl(processId: string, fileId: string): Observable<PortalDownloadUrlResponse> {
    return this.http
      .get<PortalDownloadUrlResponse>(`${this.apiUrl}/processes/${processId}/documents/${fileId}/download`)
      .pipe(
        catchError((error) => throwError(() => new Error(error.error?.message || 'No se pudo generar el enlace de descarga')))
      );
  }
}
