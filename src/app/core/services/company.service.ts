import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompanyLogoSignedUrlResponse,
  CompanyProfile,
  UpdateCompanyRequest,
} from '../models/company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/company`;

  getCompany(): Observable<CompanyProfile> {
    return this.http
      .get<{ company: CompanyProfile }>(this.apiUrl)
      .pipe(map((res) => res.company));
  }

  updateCompany(dto: UpdateCompanyRequest): Observable<CompanyProfile> {
    return this.http
      .patch<{ company: CompanyProfile }>(this.apiUrl, this.stripEmptyStrings(dto))
      .pipe(map((res) => res.company));
  }

  private stripEmptyStrings(dto: UpdateCompanyRequest): UpdateCompanyRequest {
    const cleaned: UpdateCompanyRequest = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== '') {
        (cleaned as Record<string, unknown>)[key] = value;
      }
    }
    return cleaned;
  }

  uploadLogo(file: File): Observable<CompanyProfile> {
    return this.http
      .post<CompanyLogoSignedUrlResponse>(`${this.apiUrl}/logo/signed-url`, {
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
                throw new Error(`Error al subir el logo: ${response.statusText}`);
              }
              return this.http.post<{ company: CompanyProfile }>(
                `${this.apiUrl}/logo`,
                {
                  key: signed.key,
                  bucket: signed.bucket,
                  originalFilename: file.name,
                  contentType: file.type,
                  size: file.size,
                },
              );
            }),
          ),
        ),
        map((res) => res.company),
      );
  }
}
