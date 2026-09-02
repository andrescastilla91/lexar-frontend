import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateDeadlineRequest,
  DeadlineResponse,
  QueryDeadlinesFilters,
  UpdateDeadlineRequest,
} from '../models/deadline.model';

interface DeadlinesListResponse {
  message: string;
  deadlines: DeadlineResponse[];
}

interface DeadlineItemResponse {
  message: string;
  deadline: DeadlineResponse;
}

// BUG-20 ola 2: todos los catchError de este servicio leen error.message —
// no error.error?.message — porque error.interceptor.ts (BUG-19) ya calculó
// ahí el mensaje real y seguro (nunca confía en el body de un 500, descarta
// el 404 de ruta sin match). Leer error.error?.message se salta esa lógica.
@Injectable({ providedIn: 'root' })
export class DeadlinesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Plazos de un proceso puntual (A3.6 — tab "Plazos" en detalle del proceso). */
  getForProcess(processId: string): Observable<DeadlineResponse[]> {
    return this.http
      .get<DeadlinesListResponse>(
        `${this.apiUrl}/legal-processes/${processId}/deadlines`,
      )
      .pipe(
        map((response) => response.deadlines),
        catchError((error) => {
          console.error('Error al obtener plazos del proceso:', error);
          return throwError(
            () => new Error(error.message || 'Error al cargar plazos'),
          );
        }),
      );
  }

  create(
    processId: string,
    data: CreateDeadlineRequest,
  ): Observable<DeadlineResponse> {
    return this.http
      .post<DeadlineItemResponse>(
        `${this.apiUrl}/legal-processes/${processId}/deadlines`,
        data,
      )
      .pipe(
        map((response) => response.deadline),
        catchError((error) => {
          console.error('Error al crear plazo:', error);
          return throwError(
            () => new Error(error.message || 'Error al crear plazo'),
          );
        }),
      );
  }

  /** Listado global de plazos (calendario, "mis plazos"), con filtros opcionales. */
  getAll(filters?: QueryDeadlinesFilters): Observable<DeadlineResponse[]> {
    const params: Record<string, string> = {};
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;
    if (filters?.assignee) params['assignee'] = filters.assignee;
    if (filters?.type) params['type'] = filters.type;
    if (filters?.processId) params['processId'] = filters.processId;

    return this.http
      .get<DeadlinesListResponse>(`${this.apiUrl}/deadlines`, { params })
      .pipe(
        map((response) => response.deadlines),
        catchError((error) => {
          console.error('Error al obtener plazos:', error);
          return throwError(
            () => new Error(error.message || 'Error al cargar plazos'),
          );
        }),
      );
  }

  /** Plazo puntual por id (F18 — deep link desde búsqueda global). */
  getOne(id: string): Observable<DeadlineResponse> {
    return this.http
      .get<DeadlineItemResponse>(`${this.apiUrl}/deadlines/${id}`)
      .pipe(
        map((response) => response.deadline),
        catchError((error) => {
          console.error('Error al obtener el plazo:', error);
          return throwError(
            () => new Error(error.message || 'Error al cargar el plazo'),
          );
        }),
      );
  }

  update(
    id: string,
    data: UpdateDeadlineRequest,
  ): Observable<DeadlineResponse> {
    return this.http
      .patch<DeadlineItemResponse>(`${this.apiUrl}/deadlines/${id}`, data)
      .pipe(
        map((response) => response.deadline),
        catchError((error) => {
          console.error('Error al actualizar plazo:', error);
          return throwError(
            () =>
              new Error(error.message || 'Error al actualizar plazo'),
          );
        }),
      );
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/deadlines/${id}`)
      .pipe(
        map(() => undefined),
        catchError((error) => {
          console.error('Error al eliminar plazo:', error);
          return throwError(
            () => new Error(error.message || 'Error al eliminar plazo'),
          );
        }),
      );
  }
}
