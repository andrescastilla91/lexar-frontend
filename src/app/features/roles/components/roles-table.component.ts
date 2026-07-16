import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Role } from '../../../core/models/role-backend.model';

@Component({
  selector: 'app-roles-table',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (roles().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">No se encontraron roles</p>
      </div>
    } @else {
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (role of roles(); track role.id) {
          <article class="flex min-h-[280px] flex-col rounded-lg border border-default bg-surface p-6 shadow-card transition hover:shadow-card">
            <div class="mb-3">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold text-text">{{ role.name }}</h3>
                @if (role.isSystem) {
                  <span class="rounded-full bg-info-tint px-2 py-0.5 text-xs font-semibold text-info">
                    Sistema
                  </span>
                }
              </div>
            </div>

            <div class="mb-4 flex-grow">
              @if (role.description) {
                <p class="text-sm text-subtle">{{ role.description }}</p>
              } @else {
                <p class="text-sm italic text-subtle">Sin descripción</p>
              }
            </div>

            <div class="mb-4 rounded-md border border-default bg-surface-muted p-3">
              <p class="text-xs font-medium text-muted">Permisos asignados</p>
              <p class="mt-1 text-2xl font-semibold text-text">
                {{ role.permissions?.length || 0 }}
              </p>
            </div>

            <div class="mt-auto flex gap-2">
              <button
                *hasPermission="'roles.edit'"
                type="button"
                (click)="edit.emit(role)"
                class="flex-1 rounded-md border border-default px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted"
                [disabled]="role.isSystem"
                [class.opacity-50]="role.isSystem"
                [class.cursor-not-allowed]="role.isSystem"
              >
                Editar
              </button>
              <button
                *hasPermission="'roles.assign-permissions'"
                type="button"
                (click)="managePermissions.emit(role)"
                class="flex-1 rounded-md bg-navy-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-navy-950"
              >
                Permisos
              </button>
              <button
                *hasPermission="'roles.delete'"
                type="button"
                (click)="delete.emit(role)"
                class="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger-tint"
                [disabled]="role.isSystem"
                [class.opacity-50]="role.isSystem"
                [class.cursor-not-allowed]="role.isSystem"
              >
                Eliminar
              </button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class RolesTableComponent {
  roles = input.required<Role[]>();
  isLoading = input(false);

  edit = output<Role>();
  managePermissions = output<Role>();
  delete = output<Role>();
}
