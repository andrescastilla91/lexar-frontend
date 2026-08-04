import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
} from '../models/user-backend.model';

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
}
