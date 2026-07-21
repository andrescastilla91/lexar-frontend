import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChangeMyPasswordRequest,
  ProfileUser,
  SessionInfo,
  SignedUrlResponse,
  UpdateProfileRequest,
} from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users/me`;

  getMe(): Observable<ProfileUser> {
    return this.http
      .get<{ user: ProfileUser }>(this.apiUrl)
      .pipe(map((res) => res.user));
  }

  updateMe(dto: UpdateProfileRequest): Observable<ProfileUser> {
    return this.http
      .patch<{ user: ProfileUser }>(this.apiUrl, dto)
      .pipe(map((res) => res.user));
  }

  changePassword(dto: ChangeMyPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/change-password`,
      dto,
    );
  }

  getSessions(): Observable<SessionInfo[]> {
    return this.http
      .get<{ sessions: SessionInfo[] }>(`${this.apiUrl}/sessions`)
      .pipe(map((res) => res.sessions));
  }

  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/sessions/${sessionId}`,
    );
  }

  uploadAvatar(file: File): Observable<ProfileUser> {
    return this.http
      .post<SignedUrlResponse>(`${this.apiUrl}/avatar/signed-url`, {
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
                throw new Error(`Error al subir el archivo: ${response.statusText}`);
              }
              return this.http.post<{ user: ProfileUser }>(
                `${this.apiUrl}/avatar`,
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
        map((res) => res.user),
      );
  }
}
