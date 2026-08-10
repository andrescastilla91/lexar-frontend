import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LegalProcessResponse,
  CreateLegalProcessRequest,
  UpdateLegalProcessRequest,
  UpdateProcessStatusRequest,
  ProcessStatus,
} from '../models/legal-process.model';

interface LegalProcessesListResponse {
  message: string;
  legalProcesses: LegalProcessResponse[];
  total: number;
  page: number;
  limit: number;
}

interface LegalProcessItemResponse {
  message: string;
  legalProcess: LegalProcessResponse;
}

@Injectable({ providedIn: 'root' })
export class LegalProcessesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/legal-processes`;

  /**
   * Obtener todos los procesos legales de la empresa
   */
  getLegalProcesses(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: ProcessStatus;
      clientId?: string;
      advisorId?: string;
      search?: string;
    }
  ): Observable<LegalProcessesListResponse> {
    let params: any = { page: page.toString(), limit: limit.toString() };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.clientId) params.clientId = filters.clientId;
      if (filters.advisorId) params.advisorId = filters.advisorId;
      if (filters.search) params.search = filters.search;
    }

    return this.http.get<LegalProcessesListResponse>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error al obtener procesos legales:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar procesos legales'));
      })
    );
  }

  /**
   * Obtener un proceso legal por ID
   */
  getLegalProcess(id: string): Observable<LegalProcessResponse> {
    return this.http.get<LegalProcessItemResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.legalProcess),
      catchError((error) => {
        console.error('Error al obtener proceso legal:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar proceso legal'));
      })
    );
  }

  /**
   * Crear un nuevo proceso legal
   */
  createLegalProcess(data: CreateLegalProcessRequest): Observable<LegalProcessResponse> {
    return this.http.post<LegalProcessItemResponse>(this.apiUrl, data).pipe(
      map(response => response.legalProcess),
      catchError((error) => {
        console.error('Error al crear proceso legal:', error);
        return throwError(() => new Error(error.error?.message || 'Error al crear proceso legal'));
      })
    );
  }

  /**
   * Actualizar un proceso legal existente
   */
  updateLegalProcess(id: string, data: UpdateLegalProcessRequest): Observable<LegalProcessResponse> {
    return this.http.put<LegalProcessItemResponse>(`${this.apiUrl}/${id}`, data).pipe(
      map(response => response.legalProcess),
      catchError((error) => {
        console.error('Error al actualizar proceso legal:', error);
        return throwError(() => new Error(error.error?.message || 'Error al actualizar proceso legal'));
      })
    );
  }

  /**
   * Actualizar solo el estado de un proceso legal
   */
  updateProcessStatus(id: string, data: UpdateProcessStatusRequest): Observable<LegalProcessResponse> {
    return this.http.patch<LegalProcessItemResponse>(`${this.apiUrl}/${id}/status`, data).pipe(
      map(response => response.legalProcess),
      catchError((error) => {
        console.error('Error al actualizar estado del proceso:', error);
        return throwError(() => new Error(error.error?.message || 'Error al actualizar estado del proceso'));
      })
    );
  }

  /**
   * Eliminar un proceso legal
   */
  deleteLegalProcess(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar proceso legal:', error);
        return throwError(() => new Error(error.error?.message || 'Error al eliminar proceso legal'));
      })
    );
  }
}
