import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaskStatusRequest,
  TaskApprovalCandidate,
  TaskStatusResponse,
  UpdateTaskStatusRequest,
} from '../models/task-status.model';

interface TaskStatusesListResponse {
  message: string;
  statuses: TaskStatusResponse[];
}

interface TaskStatusItemResponse {
  message: string;
  status: TaskStatusResponse;
}

interface TaskApprovalCandidatesResponse {
  message: string;
  users: TaskApprovalCandidate[];
}

/**
 * Catálogo de estados de tarea, configurable por tenant (F14).
 *
 * BUG-20 ola 2: los catchError leen error.message — no error.error?.message
 * — ver el comentario en deadlines.service.ts.
 */
@Injectable({ providedIn: 'root' })
export class TaskStatusesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAll(): Observable<TaskStatusResponse[]> {
    return this.http.get<TaskStatusesListResponse>(`${this.apiUrl}/task-statuses`).pipe(
      map((response) => response.statuses),
      catchError((error) => {
        console.error('Error al obtener estados de tareas:', error);
        return throwError(() => new Error(error.message || 'Error al cargar los estados'));
      })
    );
  }

  create(data: CreateTaskStatusRequest): Observable<TaskStatusResponse> {
    return this.http.post<TaskStatusItemResponse>(`${this.apiUrl}/task-statuses`, data).pipe(
      map((response) => response.status),
      catchError((error) => {
        console.error('Error al crear estado de tarea:', error);
        return throwError(() => new Error(error.message || 'Error al crear el estado'));
      })
    );
  }

  update(id: string, data: UpdateTaskStatusRequest): Observable<TaskStatusResponse> {
    return this.http.patch<TaskStatusItemResponse>(`${this.apiUrl}/task-statuses/${id}`, data).pipe(
      map((response) => response.status),
      catchError((error) => {
        console.error('Error al actualizar estado de tarea:', error);
        return throwError(() => new Error(error.message || 'Error al actualizar el estado'));
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/task-statuses/${id}`).pipe(
      map(() => undefined),
      catchError((error) => {
        console.error('Error al eliminar estado de tarea:', error);
        return throwError(() => new Error(error.message || 'Error al eliminar el estado'));
      })
    );
  }

  /** Candidatos a aprobador para el selector en Configuración: usuarios
   * activos con el permiso tasks.approve. */
  getApprovalCandidates(): Observable<TaskApprovalCandidate[]> {
    return this.http
      .get<TaskApprovalCandidatesResponse>(`${this.apiUrl}/task-statuses/approval-candidates`)
      .pipe(
        map((response) => response.users),
        catchError((error) => {
          console.error('Error al obtener candidatos a aprobador:', error);
          return throwError(() => new Error(error.message || 'Error al cargar los candidatos'));
        })
      );
  }
}
