export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}

export interface RolesListResponse {
  roles: Role[];
  total: number;
}

export interface RoleResponse {
  message?: string;
  role: Role;
}

export interface PermissionsListResponse {
  permissions: Permission[];
  total: number;
}

export interface RolePermissionsResponse {
  permissions: Permission[];
  total: number;
}
