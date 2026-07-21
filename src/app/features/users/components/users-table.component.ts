import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { AvatarComponent } from '../../../core/components/avatar.component';
import { UserBackend } from '../../../core/models/user-backend.model';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [DatePipe, HasPermissionDirective, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (users().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">No se encontraron usuarios</p>
      </div>
    } @else {
      <div class="hidden md:block rounded-lg border border-default bg-surface shadow-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
          <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-6 py-4">Usuario</th>
              <th class="px-6 py-4">Roles</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4">Fecha creación</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            @for (user of users(); track user.id) {
              <tr class="transition hover:bg-surface-muted">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                      {{ getUserInitials(user) }}
                    </div>
                    <div>
                      <p class="font-semibold text-text">{{ user.firstName }} {{ user.lastName }}</p>
                      <p class="text-sm text-subtle">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1">
                    @for (role of user.roles; track role.id) {
                      <span class="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-text">
                        {{ role.name }}
                      </span>
                    }
                    @if (user.roles.length === 0) {
                      <span class="text-sm text-subtle">Sin roles</span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                    [class]="user.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
                  >
                    {{ user.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-muted">
                  {{ user.createdAt | date: 'dd/MM/yyyy' }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      *hasPermission="'users.edit'"
                      type="button"
                      (click)="edit.emit(user)"
                      class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                      title="Editar"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                      </svg>
                    </button>
                    <button
                      *hasPermission="['users.activate', 'users.deactivate']"
                      type="button"
                      (click)="toggleStatus.emit(user)"
                      class="rounded-lg p-2 transition"
                      [class]="user.isActive ? 'text-warning hover:bg-warning-tint hover:text-warning' : 'text-success hover:bg-success-tint hover:text-success'"
                      [title]="user.isActive ? 'Desactivar usuario' : 'Activar usuario'"
                    >
                      @if (user.isActive) {
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      } @else {
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      }
                    </button>
                    <button
                      *hasPermission="'users.assign-roles'"
                      type="button"
                      (click)="assignRoles.emit(user)"
                      class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                      title="Asignar roles"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                    </button>
                    <button
                      *hasPermission="'users.delete'"
                      type="button"
                      (click)="delete.emit(user)"
                      class="rounded-lg p-2 text-danger hover:bg-danger-tint hover:text-danger"
                      title="Eliminar"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        </div>
      </div>

      <div class="grid gap-4 md:hidden">
        @for (user of users(); track user.id) {
          <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-3">
                <app-avatar [url]="user.avatarUrl ?? null" [initials]="getUserInitials(user)" [size]="40" />
                <div>
                  <p class="font-semibold text-text">{{ user.firstName }} {{ user.lastName }}</p>
                  <p class="text-sm text-subtle">{{ user.email }}</p>
                </div>
              </div>
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                [class]="user.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
              >
                {{ user.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <div class="mb-3 space-y-2 text-sm">
              <div>
                <span class="text-xs font-medium text-subtle">Roles:</span>
                <div class="mt-1 flex flex-wrap gap-1">
                  @for (role of user.roles; track role.id) {
                    <span class="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-text">
                      {{ role.name }}
                    </span>
                  }
                  @if (user.roles.length === 0) {
                    <span class="text-xs text-subtle">Sin roles</span>
                  }
                </div>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Fecha creación:</span>
                <span class="ml-2 text-xs text-muted">{{ user.createdAt | date: 'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                *hasPermission="'users.edit'"
                type="button"
                (click)="edit.emit(user)"
                class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
              >
                Editar
              </button>
              <button
                *hasPermission="'users.assign-roles'"
                type="button"
                (click)="assignRoles.emit(user)"
                class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
              >
                Roles
              </button>
              <button
                *hasPermission="['users.activate', 'users.deactivate']"
                type="button"
                (click)="toggleStatus.emit(user)"
                class="rounded-md px-3 py-2 text-xs font-medium transition"
                [class]="user.isActive ? 'border border-warning text-warning hover:bg-warning-tint' : 'border border-success text-success hover:bg-success-tint'"
              >
                {{ user.isActive ? 'Desactivar' : 'Activar' }}
              </button>
              <button
                *hasPermission="'users.delete'"
                type="button"
                (click)="delete.emit(user)"
                class="rounded-md border border-danger px-3 py-2 text-xs font-medium text-danger transition hover:bg-danger-tint"
              >
                Eliminar
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class UsersTableComponent {
  users = input.required<UserBackend[]>();
  isLoading = input(false);

  edit = output<UserBackend>();
  toggleStatus = output<UserBackend>();
  assignRoles = output<UserBackend>();
  delete = output<UserBackend>();

  getUserInitials(user: UserBackend): string {
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }
}
