import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TaskResponse } from '../models/task.model';
import { DecideTaskApprovalRequest, TaskApprovalRequestResponse } from '../models/task-approval.model';

interface TaskApprovalsListResponse {
  message: string;
  approvals: TaskApprovalRequestResponse[];
}

interface TaskApprovalDecideResponse {
  message: string;
  task: TaskResponse | null;
}

/** Bandeja de aprobaciones pendientes de tareas (F14, segunda ronda). */
@Injectable({ providedIn: 'root' })
export class TaskApprovalsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listPending(): Observable<TaskApprovalRequestResponse[]> {
    return this.http.get<TaskApprovalsListResponse>(`${this.apiUrl}/task-approvals`).pipe(
      map((response) => response.approvals),
      catchError((error) => {
        console.error('Error al obtener aprobaciones pendientes:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar las aprobaciones pendientes'));
      })
    );
  }

  decide(id: string, data: DecideTaskApprovalRequest): Observable<TaskResponse | null> {
    return this.http
      .post<TaskApprovalDecideResponse>(`${this.apiUrl}/task-approvals/${id}/decide`, data)
      .pipe(
        map((response) => response.task),
        catchError((error) => {
          console.error('Error al decidir la solicitud de aprobación:', error);
          return throwError(() => new Error(error.error?.message || 'Error al decidir la solicitud'));
        })
      );
  }
}
