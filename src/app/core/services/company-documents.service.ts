import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompanyDocument,
  CompanyDocumentType,
  CompanyLogoSignedUrlResponse,
} from '../models/company.model';

/** F45: RUT, cámara de comercio y cédula del representante legal del tenant. */
@Injectable({ providedIn: 'root' })
export class CompanyDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/company/documents`;

  list(): Observable<CompanyDocument[]> {
    return this.http
      .get<{ documents: CompanyDocument[] }>(this.apiUrl)
      .pipe(map((res) => res.documents));
  }

  upload(documentType: CompanyDocumentType, file: File, issuedAt?: string): Observable<CompanyDocument> {
    return this.http
      .post<CompanyLogoSignedUrlResponse>(`${this.apiUrl}/signed-url`, {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })
      .pipe(
        switchMap((signed) =>
          from(
            fetch(signed.url, {
              method: 'PUT',
              headers: { 'Content-Type': file.type },
              body: file,
            }),
          ).pipe(
            switchMap((response) => {
              if (!response.ok) {
                throw new Error(`Error al subir el documento: ${response.statusText}`);
              }
              return this.http.post<{ document: CompanyDocument }>(this.apiUrl, {
                documentType,
                key: signed.key,
                bucket: signed.bucket,
                originalFilename: file.name,
                contentType: file.type,
                size: file.size,
                ...(issuedAt ? { issuedAt } : {}),
              });
            }),
          ),
        ),
        map((res) => res.document),
      );
  }

  remove(documentType: CompanyDocumentType): Observable<void> {
    return this.http.delete(`${this.apiUrl}/${documentType}`).pipe(map(() => undefined));
  }
}
