import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly authService = inject(AuthService);

  readonly userPermissions = computed(() => this.authService.currentUser()?.permissions || []);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const permissions = this.userPermissions();
    return permissions.includes(permission);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPerms = this.userPermissions();
    return permissions.some((permission) => userPerms.includes(permission));
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPerms = this.userPermissions();
    return permissions.every((permission) => userPerms.includes(permission));
  }

  /**
   * Obtiene todos los permisos del usuario actual
   */
  getAllPermissions(): string[] {
    return this.userPermissions();
  }
}
