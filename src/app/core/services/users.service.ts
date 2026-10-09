import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  UserBackend,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRolesRequest,
  ChangePasswordRequest,
  UsersListResponse,
  UserResponse,
  CreateUserResponse,
  AssignableUsersResponse,
  EffectivePermissionsResponse,
} from '../models/user-backend.model';
import { readBlobErrorMessage } from '../utils/blob-download.util';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  getUsers(page: number = 1, limit: number = 10): Observable<UsersListResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<UsersListResponse>(this.apiUrl, { params });
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  /** F41 (ola 4, correcciones #2): lista liviana para el selector de
   * "asignar a" de un evento general — sin el permiso `users.list` que
   * exige `getUsers()` (ver users.controller.ts, findAssignable). */
  getAssignableUsers(): Observable<AssignableUsersResponse> {
    return this.http.get<AssignableUsersResponse>(`${this.apiUrl}/assignable`);
  }

  createUser(user: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.apiUrl, user);
  }

  updateUser(id: string, user: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  assignRoles(id: string, roleIds: string[]): Observable<UserResponse> {
    const payload: AssignRolesRequest = { roleIds };
    return this.http.post<UserResponse>(`${this.apiUrl}/${id}/assign-roles`, payload);
  }

  changePassword(id: string, newPassword: string): Observable<{ message: string }> {
    const payload: ChangePasswordRequest = { newPassword };
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/change-password`, payload);
  }

  toggleActive(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  resendInvitation(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/resend-invitation`, {});
  }

  /** F11 (S10): desactivación forzada del 2FA de otro usuario — requiere `users.manage-2fa`. */
  disableTwoFactor(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/disable-2fa`, {});
  }

  /** F39 (ROL-07): permisos efectivos — requiere `users.view` + `roles.view`. */
  getEffectivePermissions(id: string): Observable<EffectivePermissionsResponse> {
    return this.http.get<EffectivePermissionsResponse>(`${this.apiUrl}/${id}/effective-permissions`);
  }

  /** F39 (ROL-07): CSV de permisos efectivos; baja como blob para poder leer el error real. */
  exportEffectivePermissions(id: string): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/${id}/effective-permissions/export`, { responseType: 'blob' })
      .pipe(
        catchError((err: HttpErrorResponse) =>
          readBlobErrorMessage(err, 'No se pudo exportar los permisos efectivos'),
        ),
      );
  }
}
