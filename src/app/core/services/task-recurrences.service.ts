import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaskRecurrenceRequest,
  QueryTaskRecurrencesFilters,
  TaskRecurrenceResponse,
  UpdateTaskRecurrenceRequest,
} from '../models/task-recurrence.model';
import { TaskResponse } from '../models/task.model';

interface RecurrencesListResponse {
  message: string;
  recurrences: TaskRecurrenceResponse[];
}

interface RecurrenceItemResponse {
  message: string;
  recurrence: TaskRecurrenceResponse;
}

interface OccurrencesResponse {
  message: string;
  tasks: TaskResponse[];
}

// BUG-20 ola 2: los catchError leen error.message (no error.error?.message) —
// ver el comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class TaskRecurrencesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAll(
    filters?: QueryTaskRecurrencesFilters,
  ): Observable<TaskRecurrenceResponse[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params['status'] = filters.status;
    if (filters?.processId) params['processId'] = filters.processId;
    if (filters?.clientId) params['clientId'] = filters.clientId;

    return this.http
      .get<RecurrencesListResponse>(`${this.apiUrl}/task-recurrences`, {
        params,
      })
      .pipe(
        map((response) => response.recurrences),
        catchError((error) => {
          console.error('Error al obtener tareas recurrentes:', error);
          return throwError(
            () =>
              new Error(error.message || 'Error al cargar tareas recurrentes'),
          );
        }),
      );
  }

  getOccurrences(id: string): Observable<TaskResponse[]> {
    return this.http
      .get<OccurrencesResponse>(
        `${this.apiUrl}/task-recurrences/${id}/occurrences`,
      )
      .pipe(
        map((response) => response.tasks),
        catchError((error) => {
          console.error('Error al obtener las ocurrencias:', error);
          return throwError(
            () => new Error(error.message || 'Error al cargar las ocurrencias'),
          );
        }),
      );
  }

  create(
    request: CreateTaskRecurrenceRequest,
  ): Observable<TaskRecurrenceResponse> {
    return this.http
      .post<RecurrenceItemResponse>(`${this.apiUrl}/task-recurrences`, request)
      .pipe(
        map((response) => response.recurrence),
        catchError((error) => {
          console.error('Error al crear la tarea recurrente:', error);
          return throwError(
            () =>
              new Error(error.message || 'Error al crear la tarea recurrente'),
          );
        }),
      );
  }

  update(
    id: string,
    request: UpdateTaskRecurrenceRequest,
  ): Observable<TaskRecurrenceResponse> {
    return this.http
      .patch<RecurrenceItemResponse>(
        `${this.apiUrl}/task-recurrences/${id}`,
        request,
      )
      .pipe(
        map((response) => response.recurrence),
        catchError((error) => {
          console.error('Error al actualizar la tarea recurrente:', error);
          return throwError(
            () =>
              new Error(
                error.message || 'Error al actualizar la tarea recurrente',
              ),
          );
        }),
      );
  }

  stop(id: string): Observable<TaskRecurrenceResponse> {
    return this.http
      .post<RecurrenceItemResponse>(
        `${this.apiUrl}/task-recurrences/${id}/stop`,
        {},
      )
      .pipe(
        map((response) => response.recurrence),
        catchError((error) => {
          console.error('Error al detener la tarea recurrente:', error);
          return throwError(
            () =>
              new Error(
                error.message || 'Error al detener la tarea recurrente',
              ),
          );
        }),
      );
  }

  resume(id: string): Observable<TaskRecurrenceResponse> {
    return this.http
      .post<RecurrenceItemResponse>(
        `${this.apiUrl}/task-recurrences/${id}/resume`,
        {},
      )
      .pipe(
        map((response) => response.recurrence),
        catchError((error) => {
          console.error('Error al reanudar la tarea recurrente:', error);
          return throwError(
            () =>
              new Error(
                error.message || 'Error al reanudar la tarea recurrente',
              ),
          );
        }),
      );
  }

  finalize(id: string): Observable<TaskRecurrenceResponse> {
    return this.http
      .post<RecurrenceItemResponse>(
        `${this.apiUrl}/task-recurrences/${id}/finalize`,
        {},
      )
      .pipe(
        map((response) => response.recurrence),
        catchError((error) => {
          console.error('Error al finalizar la tarea recurrente:', error);
          return throwError(
            () =>
              new Error(
                error.message || 'Error al finalizar la tarea recurrente',
              ),
          );
        }),
      );
  }
}
