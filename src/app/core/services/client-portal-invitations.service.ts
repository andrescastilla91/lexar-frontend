import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClientPortalInvitationsListResponse,
  InviteClientPortalRequest,
  InviteClientPortalResponse,
  PortalMessageResponse,
} from '../models/portal.model';

/**
 * F16 — lado interno: invitar clientes al portal desde el detalle del
 * cliente (A3.2). Vive bajo /clients/:clientId/portal-invitations (mismo
 * prefijo REST que ClientsService, pero el endpoint vive en PortalModule
 * en el backend — ver ClientPortalInvitationsController).
 */
@Injectable({
  providedIn: 'root',
})
export class ClientPortalInvitationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  list(clientId: string): Observable<ClientPortalInvitationsListResponse> {
    return this.http.get<ClientPortalInvitationsListResponse>(
      `${this.apiUrl}/${clientId}/portal-invitations`,
    );
  }

  invite(clientId: string, email: string): Observable<InviteClientPortalResponse> {
    const request: InviteClientPortalRequest = { email };
    return this.http.post<InviteClientPortalResponse>(
      `${this.apiUrl}/${clientId}/portal-invitations`,
      request,
    );
  }

  resend(clientId: string, portalUserId: string): Observable<PortalMessageResponse> {
    return this.http.post<PortalMessageResponse>(
      `${this.apiUrl}/${clientId}/portal-invitations/${portalUserId}/resend`,
      {},
    );
  }
}
