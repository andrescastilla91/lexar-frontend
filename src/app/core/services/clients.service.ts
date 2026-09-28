import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClientResponse,
  CreateClientRequest,
  UpdateClientRequest,
  UpdateClientComplianceRequest,
  ClientContactResponse,
  CreateClientContactRequest,
  UpdateClientContactRequest,
  ClientMatterResponse,
  CreateClientMatterRequest,
  UpdateClientMatterRequest,
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

interface ClientContactsListResponse {
  message: string;
  contacts: ClientContactResponse[];
}

interface ClientContactItemResponse {
  message: string;
  contact: ClientContactResponse;
}

interface ClientMattersListResponse {
  message: string;
  matters: ClientMatterResponse[];
}

interface ClientMatterItemResponse {
  message: string;
  matter: ClientMatterResponse;
}

// BUG-20 ola 2: lee error.message — no error.error?.message — ver el
// comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clients`;
  private readonly contactsApiUrl = `${environment.apiUrl}/client-contacts`;
  private readonly mattersApiUrl = `${environment.apiUrl}/client-matters`;

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
   * QA F33 2026-09-14: actualizar el nivel de criticidad o el riesgo LA/FT
   * de un cliente — endpoint separado, gateado por clients.edit-compliance.
   */
  updateClientCompliance(
    id: string,
    data: UpdateClientComplianceRequest,
  ): Observable<ClientResponse> {
    return this.http.patch<ClientItemResponse>(`${this.apiUrl}/${id}/compliance`, data).pipe(
      map(response => response.client),
      catchError((error) => {
        console.error('Error al actualizar cumplimiento del cliente:', error);
        return throwError(() => new Error(error.message || 'Error al actualizar cumplimiento del cliente'));
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

  // ── F33: contactos ──────────────────────────────────────────────

  getContacts(clientId: string): Observable<ClientContactResponse[]> {
    return this.http
      .get<ClientContactsListResponse>(this.contactsApiUrl, {
        params: { clientId },
      })
      .pipe(
        map((response) => response.contacts),
        catchError((error) => {
          console.error('Error al obtener contactos:', error);
          return throwError(() => new Error(error.message || 'Error al cargar contactos'));
        }),
      );
  }

  createContact(data: CreateClientContactRequest): Observable<ClientContactResponse> {
    return this.http.post<ClientContactItemResponse>(this.contactsApiUrl, data).pipe(
      map((response) => response.contact),
      catchError((error) => {
        console.error('Error al crear contacto:', error);
        return throwError(() => new Error(error.message || 'Error al crear contacto'));
      }),
    );
  }

  updateContact(
    id: string,
    data: UpdateClientContactRequest,
  ): Observable<ClientContactResponse> {
    return this.http
      .patch<ClientContactItemResponse>(`${this.contactsApiUrl}/${id}`, data)
      .pipe(
        map((response) => response.contact),
        catchError((error) => {
          console.error('Error al actualizar contacto:', error);
          return throwError(() => new Error(error.message || 'Error al actualizar contacto'));
        }),
      );
  }

  removeContact(id: string): Observable<void> {
    return this.http.delete<void>(`${this.contactsApiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar contacto:', error);
        return throwError(() => new Error(error.message || 'Error al eliminar contacto'));
      }),
    );
  }

  // ── F34: asuntos (matters) ──────────────────────────────────────

  getMatters(clientId: string): Observable<ClientMatterResponse[]> {
    return this.http
      .get<ClientMattersListResponse>(this.mattersApiUrl, {
        params: { clientId },
      })
      .pipe(
        map((response) => response.matters),
        catchError((error) => {
          console.error('Error al obtener asuntos:', error);
          return throwError(() => new Error(error.message || 'Error al cargar asuntos'));
        }),
      );
  }

  createMatter(data: CreateClientMatterRequest): Observable<ClientMatterResponse> {
    return this.http.post<ClientMatterItemResponse>(this.mattersApiUrl, data).pipe(
      map((response) => response.matter),
      catchError((error) => {
        console.error('Error al crear asunto:', error);
        return throwError(() => new Error(error.message || 'Error al crear asunto'));
      }),
    );
  }

  updateMatter(id: string, data: UpdateClientMatterRequest): Observable<ClientMatterResponse> {
    return this.http.patch<ClientMatterItemResponse>(`${this.mattersApiUrl}/${id}`, data).pipe(
      map((response) => response.matter),
      catchError((error) => {
        console.error('Error al actualizar asunto:', error);
        return throwError(() => new Error(error.message || 'Error al actualizar asunto'));
      }),
    );
  }

  removeMatter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.mattersApiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar asunto:', error);
        return throwError(() => new Error(error.message || 'Error al eliminar asunto'));
      }),
    );
  }
}
