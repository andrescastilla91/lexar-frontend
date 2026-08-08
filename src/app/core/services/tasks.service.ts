import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaskRequest,
  CreateTaskTemplateRequest,
  QueryTasksFilters,
  TaskResponse,
  TaskTemplateResponse,
  UpdateTaskRequest,
  UpdateTaskTemplateRequest,
} from '../models/task.model';
import { TaskActivityResponse } from '../models/task-activity.model';

interface TasksListResponse {
  message: string;
  tasks: TaskResponse[];
}

interface TaskActivityListResponse {
  message: string;
  activity: TaskActivityResponse[];
}

interface TaskItemResponse {
  message: string;
  task: TaskResponse;
}

interface TaskTemplatesListResponse {
  message: string;
  templates: TaskTemplateResponse[];
}

interface TaskTemplateItemResponse {
  message: string;
  template: TaskTemplateResponse;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Listado global de tareas ("Mis tareas", tablero), con filtros opcionales. */
  getAll(filters?: QueryTasksFilters): Observable<TaskResponse[]> {
    const params: Record<string, string> = {};
    if (filters?.assignee) params['assignee'] = filters.assignee;
    if (filters?.processId) params['processId'] = filters.processId;
    if (filters?.statusId) params['statusId'] = filters.statusId;
    if (filters?.from) params['from'] = filters.from;
    if (filters?.to) params['to'] = filters.to;

    return this.http
      .get<TasksListResponse>(`${this.apiUrl}/tasks`, { params })
      .pipe(
        map((response) => response.tasks),
        catchError((error) => {
          console.error('Error al obtener tareas:', error);
          return throwError(
            () => new Error(error.error?.message || 'Error al cargar tareas'),
          );
        }),
      );
  }

  /** Tarea puntual por id (F18 — deep link desde búsqueda global). */
  getOne(id: string): Observable<TaskResponse> {
    return this.http.get<TaskItemResponse>(`${this.apiUrl}/tasks/${id}`).pipe(
      map((response) => response.task),
      catchError((error) => {
        console.error('Error al obtener la tarea:', error);
        return throwError(
          () => new Error(error.error?.message || 'Error al cargar la tarea'),
        );
      }),
    );
  }

  /** Tareas de un proceso puntual (A3.6 — tab "Tareas" en detalle del proceso). */
  getForProcess(processId: string): Observable<TaskResponse[]> {
    return this.http
      .get<TasksListResponse>(
        `${this.apiUrl}/legal-processes/${processId}/tasks`,
      )
      .pipe(
        map((response) => response.tasks),
        catchError((error) => {
          console.error('Error al obtener tareas del proceso:', error);
          return throwError(
            () => new Error(error.error?.message || 'Error al cargar tareas'),
          );
        }),
      );
  }

  create(data: CreateTaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskItemResponse>(`${this.apiUrl}/tasks`, data).pipe(
      map((response) => response.task),
      catchError((error) => {
        console.error('Error al crear tarea:', error);
        return throwError(
          () => new Error(error.error?.message || 'Error al crear tarea'),
        );
      }),
    );
  }

  update(id: string, data: UpdateTaskRequest): Observable<TaskResponse> {
    return this.http
      .patch<TaskItemResponse>(`${this.apiUrl}/tasks/${id}`, data)
      .pipe(
        map((response) => response.task),
        catchError((error) => {
          console.error('Error al actualizar tarea:', error);
          return throwError(
            () =>
              new Error(error.error?.message || 'Error al actualizar tarea'),
          );
        }),
      );
  }

  /** Bitácora de la tarea: quién la creó/asignó/movió/eliminó y cuándo. */
  getActivity(id: string): Observable<TaskActivityResponse[]> {
    return this.http
      .get<TaskActivityListResponse>(`${this.apiUrl}/tasks/${id}/activity`)
      .pipe(
        map((response) => response.activity),
        catchError((error) => {
          console.error('Error al obtener la bitácora de la tarea:', error);
          return throwError(
            () =>
              new Error(error.error?.message || 'Error al cargar la bitácora'),
          );
        }),
      );
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/tasks/${id}`)
      .pipe(
        map(() => undefined),
        catchError((error) => {
          console.error('Error al eliminar tarea:', error);
          return throwError(
            () => new Error(error.error?.message || 'Error al eliminar tarea'),
          );
        }),
      );
  }

  instantiateTemplate(
    processId: string,
    templateId: string,
  ): Observable<TaskResponse[]> {
    return this.http
      .post<TasksListResponse>(
        `${this.apiUrl}/legal-processes/${processId}/tasks/instantiate-template`,
        {
          templateId,
        },
      )
      .pipe(
        map((response) => response.tasks),
        catchError((error) => {
          console.error('Error al instanciar plantilla de tareas:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || 'Error al instanciar la plantilla',
              ),
          );
        }),
      );
  }

  getTemplates(): Observable<TaskTemplateResponse[]> {
    return this.http
      .get<TaskTemplatesListResponse>(`${this.apiUrl}/task-templates`)
      .pipe(
        map((response) => response.templates),
        catchError((error) => {
          console.error('Error al obtener plantillas de tareas:', error);
          return throwError(
            () =>
              new Error(error.error?.message || 'Error al cargar plantillas'),
          );
        }),
      );
  }

  createTemplate(
    data: CreateTaskTemplateRequest,
  ): Observable<TaskTemplateResponse> {
    return this.http
      .post<TaskTemplateItemResponse>(`${this.apiUrl}/task-templates`, data)
      .pipe(
        map((response) => response.template),
        catchError((error) => {
          console.error('Error al crear plantilla de tareas:', error);
          return throwError(
            () =>
              new Error(error.error?.message || 'Error al crear la plantilla'),
          );
        }),
      );
  }

  updateTemplate(
    id: string,
    data: UpdateTaskTemplateRequest,
  ): Observable<TaskTemplateResponse> {
    return this.http
      .patch<TaskTemplateItemResponse>(
        `${this.apiUrl}/task-templates/${id}`,
        data,
      )
      .pipe(
        map((response) => response.template),
        catchError((error) => {
          console.error('Error al actualizar plantilla de tareas:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || 'Error al actualizar la plantilla',
              ),
          );
        }),
      );
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http
      .delete<{ message: string }>(`${this.apiUrl}/task-templates/${id}`)
      .pipe(
        map(() => undefined),
        catchError((error) => {
          console.error('Error al eliminar plantilla de tareas:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || 'Error al eliminar la plantilla',
              ),
          );
        }),
      );
  }
}
