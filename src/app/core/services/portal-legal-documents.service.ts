import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcceptLegalDocumentResponse, PendingAcceptanceResponse } from '../models/legal-document.model';

/** F44 §LEG-03 (ola 4): consumo del gate de términos del portal del cliente. */
@Injectable({ providedIn: 'root' })
export class PortalLegalDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/portal/legal-documents`;

  getPendingAcceptance(): Observable<PendingAcceptanceResponse> {
    return this.http.get<PendingAcceptanceResponse>(`${this.apiUrl}/pending-acceptance`);
  }

  accept(documentId: string): Observable<AcceptLegalDocumentResponse> {
    return this.http.post<AcceptLegalDocumentResponse>(`${this.apiUrl}/${documentId}/accept`, {});
  }
}
