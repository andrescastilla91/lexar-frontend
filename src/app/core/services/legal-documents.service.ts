import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcceptLegalDocumentResponse,
  PendingAcceptanceResponse,
} from '../models/legal-document.model';

/** F44 §LEG-01 (ola 2): consumo del gate de términos en el login. */
@Injectable({ providedIn: 'root' })
export class LegalDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/legal-documents`;

  getPendingAcceptance(): Observable<PendingAcceptanceResponse> {
    return this.http.get<PendingAcceptanceResponse>(`${this.apiUrl}/pending-acceptance`);
  }

  accept(documentId: string): Observable<AcceptLegalDocumentResponse> {
    return this.http.post<AcceptLegalDocumentResponse>(`${this.apiUrl}/${documentId}/accept`, {});
  }
}
