import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClientResponse,
  CreateClientRequest,
  UpdateClientRequest,
} from '../models/client-backend.model';

interface ClientsListResponse {
  message: string;
  clients: ClientResponse[];
  total: number;
  page: number;
  limit: number;
}

interface ClientItemResponse {
  message: string;
  client: ClientResponse;
}

// BUG-20 ola 2: lee error.message — no error.error?.message — ver el
// comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  /**
   * Obtener todos los clientes de la empresa
   */
  getClients(page: number = 1, limit: number = 10): Observable<ClientsListResponse> {
    return this.http.get<ClientsListResponse>(this.apiUrl, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      catchError((error) => {
        console.error('Error al obtener clientes:', error);
        return throwError(() => new Error(error.message || 'Error al cargar clientes'));
      })
    );
  }

  /**
   * Obtener un cliente por ID
   */
  getClient(id: string): Observable<ClientResponse> {
    return this.http.get<ClientItemResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.client),
      catchError((error) => {
        console.error('Error al obtener cliente:', error);
        return throwError(() => new Error(error.message || 'Error al cargar cliente'));
      })
    );
  }

  /**
   * Crear un nuevo cliente
   */
  createClient(data: CreateClientRequest): Observable<ClientResponse> {
    return this.http.post<ClientItemResponse>(this.apiUrl, data).pipe(
      map(response => response.client),
      catchError((error) => {
        console.error('Error al crear cliente:', error);
        return throwError(() => new Error(error.message || 'Error al crear cliente'));
      })
    );
  }

  /**
   * Actualizar un cliente existente
   */
  updateClient(id: string, data: UpdateClientRequest): Observable<ClientResponse> {
    return this.http.put<ClientItemResponse>(`${this.apiUrl}/${id}`, data).pipe(
      map(response => response.client),
      catchError((error) => {
        console.error('Error al actualizar cliente:', error);
        return throwError(() => new Error(error.message || 'Error al actualizar cliente'));
      })
    );
  }

  /**
   * Activar/Desactivar un cliente
   */
  toggleActive(id: string): Observable<ClientResponse> {
    return this.http.patch<ClientItemResponse>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(
      map(response => response.client),
      catchError((error) => {
        console.error('Error al cambiar estado del cliente:', error);
        return throwError(() => new Error(error.message || 'Error al cambiar estado del cliente'));
      })
    );
  }
}
