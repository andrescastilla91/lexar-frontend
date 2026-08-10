import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ProcessEvent,
  CreateAnnotationRequest,
  ProcessHistoryResponse,
} from '../models/process-event.model';

@Injectable({
  providedIn: 'root',
})
export class ProcessEventsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/legal-processes`;

  /**
   * HU-16: Crear anotación en un proceso
   */
  createAnnotation(processId: string, description: string): Observable<ProcessEvent> {
    const request: CreateAnnotationRequest = { description };
    return this.http
      .post<{ annotation: ProcessEvent }>(`${this.apiUrl}/${processId}/annotations`, request)
      .pipe(map((response) => response.annotation));
  }

  /**
   * HU-17: Obtener historial de eventos de un proceso
   */
  getProcessHistory(processId: string): Observable<ProcessEvent[]> {
    return this.http
      .get<ProcessHistoryResponse>(`${this.apiUrl}/${processId}/history`)
      .pipe(map((response) => response.events));
  }

  /**
   * F16: toggle "compartir con cliente" — el backend rechaza esto para
   * eventos ANNOTATION (ver ProcessEventsService.setVisibility).
   */
  setEventVisibility(processId: string, eventId: string, visibleToClient: boolean): Observable<ProcessEvent> {
    return this.http
      .patch<{ event: ProcessEvent }>(`${this.apiUrl}/${processId}/events/${eventId}/visibility`, {
        visibleToClient,
      })
      .pipe(map((response) => response.event));
  }
}
