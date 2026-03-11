import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdvisorResponse,
  CreateAdvisorRequest,
  UpdateAdvisorRequest,
  AdvisorStatus,
} from '../models/advisor-backend.model';

interface AdvisorsListResponse {
  message: string;
  advisors: AdvisorResponse[];
  total: number;
  page: number;
  limit: number;
}

interface AdvisorItemResponse {
  message: string;
  advisor: AdvisorResponse;
}

@Injectable({ providedIn: 'root' })
export class AdvisorsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/advisors`;

  getAdvisors(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: AdvisorStatus;
      isActive?: boolean;
      search?: string;
    }
  ): Observable<AdvisorsListResponse> {
    let params: any = { page: page.toString(), limit: limit.toString() };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.isActive !== undefined) params.isActive = filters.isActive.toString();
      if (filters.search) params.search = filters.search;
    }

    return this.http.get<AdvisorsListResponse>(this.apiUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error al obtener asesores:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar asesores'));
      })
    );
  }

  getAdvisor(id: string): Observable<AdvisorResponse> {
    return this.http.get<AdvisorItemResponse>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.advisor),
      catchError((error) => {
        console.error('Error al obtener asesor:', error);
        return throwError(() => new Error(error.error?.message || 'Error al cargar asesor'));
      })
    );
  }

  createAdvisor(data: CreateAdvisorRequest): Observable<AdvisorResponse> {
    return this.http.post<AdvisorItemResponse>(this.apiUrl, data).pipe(
      map((response) => response.advisor),
      catchError((error) => {
        console.error('Error al crear asesor:', error);
        return throwError(() => new Error(error.error?.message || 'Error al crear asesor'));
      })
    );
  }

  updateAdvisor(id: string, data: UpdateAdvisorRequest): Observable<AdvisorResponse> {
    return this.http.patch<AdvisorItemResponse>(`${this.apiUrl}/${id}`, data).pipe(
      map((response) => response.advisor),
      catchError((error) => {
        console.error('Error al actualizar asesor:', error);
        return throwError(() => new Error(error.error?.message || 'Error al actualizar asesor'));
      })
    );
  }

  deleteAdvisor(id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error('Error al eliminar asesor:', error);
        return throwError(() => new Error(error.error?.message || 'Error al eliminar asesor'));
      })
    );
  }
}
