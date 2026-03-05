import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  RolesListResponse,
  RoleResponse,
  PermissionsListResponse,
  RolePermissionsResponse,
} from '../models/role-backend.model';

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/roles`;

  getRoles(): Observable<RolesListResponse> {
    return this.http.get<RolesListResponse>(this.apiUrl);
  }

  getRoleById(id: string): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.apiUrl}/${id}`);
  }

  createRole(role: CreateRoleRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.apiUrl, role);
  }

  updateRole(id: string, role: UpdateRoleRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.apiUrl}/${id}`, role);
  }

  deleteRole(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getAllPermissions(): Observable<PermissionsListResponse> {
    return this.http.get<PermissionsListResponse>(`${this.apiUrl}/permissions`);
  }

  assignPermissions(id: string, permissionIds: string[]): Observable<RoleResponse> {
    const payload: AssignPermissionsRequest = { permissionIds };
    return this.http.post<RoleResponse>(`${this.apiUrl}/${id}/permissions`, payload);
  }

  getRolePermissions(id: string): Observable<RolePermissionsResponse> {
    return this.http.get<RolePermissionsResponse>(`${this.apiUrl}/${id}/permissions`);
  }
}
