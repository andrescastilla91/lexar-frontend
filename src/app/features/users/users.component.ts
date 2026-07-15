import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { UserBackend, CreateUserRequest, UpdateUserRequest } from '../../core/models/user-backend.model';
import { Role } from '../../core/models/role-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';import { PaginationComponent } from '../../core/components/pagination.component';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, PaginationComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Gestión de usuarios</h2>
          <p class="text-sm text-subtle">Administra cuentas, roles y permisos del equipo.</p>
        </div>
        <button
          *hasPermission="'users.create'"
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo usuario
        </button>
      </header>

      <!-- Filtros compactos -->
      <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <form [formGroup]="filterForm" class="space-y-4">
          <div class="flex flex-col gap-4 sm:flex-row">
            <label class="flex-1 text-sm text-muted">
              <span class="mb-2 block">Búsqueda</span>
              <input
                type="search"
                formControlName="search"
                placeholder="Nombre, apellido o email"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Estado</span>
              <select
                formControlName="status"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>
          
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Total usuarios</p>
              <p class="text-2xl font-semibold text-text">{{ total() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Activos</p>
              <p class="text-2xl font-semibold text-success">{{ activeCount() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Inactivos</p>
              <p class="text-2xl font-semibold text-muted">{{ inactiveCount() }}</p>
            </div>
          </div>
        </form>
      </div>

      <!-- Modal para crear/editar usuario -->
      @if (panelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            class="w-full max-w-sm md:max-w-lg overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
            style="max-height: 90vh"
            [formGroup]="userForm"
            (ngSubmit)="submitUser()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-text">
                {{ editingUser() ? 'Editar usuario' : 'Nuevo usuario' }}
              </h3>
              <button
                type="button"
                (click)="cancelEdit()"
                class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="grid gap-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="text-sm text-muted">
                  Nombre
                  <input
                    formControlName="firstName"
                    type="text"
                    placeholder="Nombre"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                  @if (userForm.get('firstName')?.touched && userForm.get('firstName')?.invalid) {
                    <p class="mt-1 text-xs text-danger">Campo requerido</p>
                  }
                </label>
                <label class="text-sm text-muted">
                  Apellido
                  <input
                    formControlName="lastName"
                    type="text"
                    placeholder="Apellido"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                  @if (userForm.get('lastName')?.touched && userForm.get('lastName')?.invalid) {
                    <p class="mt-1 text-xs text-danger">Campo requerido</p>
                  }
                </label>
              </div>

              <label class="text-sm text-muted">
                Email
                <input
                  formControlName="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  [disabled]="editingUser()?.isActive ?? false"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle disabled:cursor-not-allowed"
                />
                @if (userForm.get('email')?.touched && userForm.get('email')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Email inválido</p>
                }
                @if (editingUser()?.isActive) {
                  <p class="mt-1 text-xs text-subtle">
                    <svg class="inline h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    El email no puede modificarse en usuarios activos (se usa para login)
                  </p>
                } @else if (editingUser() && !editingUser()?.isActive) {
                  <p class="mt-1 text-xs text-success">
                    <svg class="inline h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    El email puede modificarse porque el usuario está inactivo
                  </p>
                }
              </label>

              @if (!editingUser()) {
                <div class="rounded-md border border-default bg-surface-muted p-4">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="autoGeneratePassword()"
                      (change)="toggleAutoGeneratePassword()"
                      class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                    />
                    <div class="flex-1">
                      <span class="text-sm font-semibold text-text">Generar contraseña automáticamente</span>
                      <p class="text-xs text-subtle mt-0.5">
                        Se creará una contraseña segura de 16 caracteres. El usuario la recibirá por email.
                      </p>
                    </div>
                  </label>
                </div>

                @if (!autoGeneratePassword()) {
                  <label class="text-sm text-muted">
                    Contraseña
                    <input
                      formControlName="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    @if (userForm.get('password')?.touched && userForm.get('password')?.invalid) {
                      <p class="mt-1 text-xs text-danger">Mínimo 8 caracteres</p>
                    }
                  </label>
                }
              }
            </div>

            @if (errorMessage()) {
              <div class="mt-4 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                {{ errorMessage() }}
              </div>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="cancelEdit()"
                class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSubmitting() || userForm.invalid"
              >
                {{ editingUser() ? 'Actualizar' : 'Crear usuario' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (filteredUsers().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No se encontraron usuarios</p>
        </div>
      } @else {
        <!-- Tabla para desktop -->
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
              @for (user of filteredUsers(); track user.id) {
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
                        (click)="editUser(user)"
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
                        (click)="toggleUserStatus(user)"
                        class="rounded-lg p-2 transition"
                        [class]="user.isActive ? 'text-warning hover:bg-warning-tint hover:text-warning' : 'text-success hover:bg-success-tint hover:text-success'"
                        [title]="user.isActive ? 'Desactivar usuario' : 'Activar usuario'"
                      >
                        @if (user.isActive) {
                          <!-- Ícono de Desactivar (X en círculo) -->
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        } @else {
                          <!-- Ícono de Activar (Check en círculo) -->
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        }
                      </button>
                      <button
                        *hasPermission="'users.assign-roles'"
                        type="button"
                        (click)="assignRoles(user)"
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
                        (click)="deleteUser(user)"
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

        <!-- Cards para móvil -->
        <div class="grid gap-4 md:hidden">
          @for (user of filteredUsers(); track user.id) {
            <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
              <div class="mb-3 flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {{ getUserInitials(user) }}
                  </div>
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
                  (click)="editUser(user)"
                  class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
                >
                  Editar
                </button>
                <button
                  *hasPermission="'users.assign-roles'"
                  type="button"
                  (click)="assignRoles(user)"
                  class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
                >
                  Roles
                </button>
                <button
                  *hasPermission="['users.activate', 'users.deactivate']"
                  type="button"
                  (click)="toggleUserStatus(user)"
                  class="rounded-md px-3 py-2 text-xs font-medium transition"
                  [class]="user.isActive ? 'border border-warning text-warning hover:bg-warning-tint' : 'border border-success text-success hover:bg-success-tint'"
                >
                  {{ user.isActive ? 'Desactivar' : 'Activar' }}
                </button>
                <button
                  *hasPermission="'users.delete'"
                  type="button"
                  (click)="deleteUser(user)"
                  class="rounded-md border border-danger px-3 py-2 text-xs font-medium text-danger transition hover:bg-danger-tint"
                >
                  Eliminar
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Paginación -->
        <app-pagination
          [total]="total()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize"
          [currentItems]="filteredUsers().length"
          [totalPages]="totalPages()"
          itemLabel="usuarios"
          (nextPage)="nextPage()"
          (previousPage)="previousPage()"
        />
      }

      @if (showRolesModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div class="w-full max-w-sm md:max-w-md overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl" style="max-height: 90vh">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-text">Asignar roles</h3>
              <button
                type="button"
                (click)="closeRolesModal()"
                class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p class="mb-4 text-sm text-muted">
              Usuario: <strong>{{ selectedUser()?.firstName }} {{ selectedUser()?.lastName }}</strong>
            </p>

            <div class="mb-6 space-y-2">
              @for (role of availableRoles(); track role.id) {
                <label class="flex items-center gap-3 rounded-md border border-default p-3 transition hover:bg-surface-muted cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="isRoleSelected(role.id)"
                    (change)="toggleRole(role.id)"
                    class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-navy-900"
                  />
                  <div class="flex-1">
                    <p class="font-medium text-text">{{ role.name }}</p>
                    @if (role.description) {
                      <p class="text-xs text-subtle">{{ role.description }}</p>
                    }
                  </div>
                </label>
              }
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="closeRolesModal()"
                class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="saveRoles()"
                class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950"
                [disabled]="isSubmitting()"
              >
                Guardar roles
              </button>
            </div>
          </div>
        </div>
      }

      @if (generatedPasswordData()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div class="w-full max-w-sm md:max-w-md rounded-lg border-2 border-success bg-surface p-4 md:p-6 shadow-2xl">
            <div class="mb-4 flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-success-tint">
                <svg class="h-6 w-6 text-success" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-success">¡Usuario creado exitosamente!</h3>
                <p class="text-sm text-success">Contraseña generada automáticamente</p>
              </div>
            </div>

            <div class="mb-4 rounded-md bg-warning-tint border border-warning p-4">
              <div class="flex items-start gap-2">
                <svg class="h-5 w-5 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div class="text-sm text-warning">
                  <strong>¡IMPORTANTE!</strong> Esta contraseña solo se mostrará una vez. Guárdala de forma segura antes de cerrar esta ventana.
                </div>
              </div>
            </div>

            <div class="mb-4 space-y-3">
              <div>
                <label class="text-xs font-semibold uppercase tracking-wide text-subtle">Email del usuario</label>
                <p class="mt-1 text-sm font-medium text-text">{{ generatedPasswordData()?.email }}</p>
              </div>

              <div>
                <label class="text-xs font-semibold uppercase tracking-wide text-subtle">Contraseña temporal</label>
                <div class="mt-1 flex items-center gap-2">
                  <code class="flex-1 rounded-md border border-default bg-surface-muted px-4 py-3 font-mono text-sm font-semibold text-text select-all">
                    {{ generatedPasswordData()?.password }}
                  </code>
                  <button
                    type="button"
                    (click)="copyPasswordToClipboard()"
                    class="rounded-md bg-navy-900 p-3 text-white transition hover:bg-navy-950"
                    title="Copiar al portapapeles"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="mb-4 rounded-md border border-default bg-surface-muted p-3 text-xs text-muted">
              <strong>Próximos pasos:</strong>
              <ol class="mt-2 ml-4 list-decimal space-y-1">
                <li>Copia la contraseña usando el botón de copiar</li>
                <li>Envía las credenciales al usuario de forma segura (email, mensaje cifrado, etc.)</li>
                <li>El usuario debe cambiar esta contraseña en su primer inicio de sesión</li>
              </ol>
            </div>

            <button
              type="button"
              (click)="closeGeneratedPasswordModal()"
              class="w-full rounded-md bg-success px-4 py-3 text-sm font-semibold text-white transition hover:bg-success"
            >
              Entendido, he guardado la contraseña
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);

  readonly users = signal<UserBackend[]>([]);
  readonly availableRoles = signal<Role[]>([]);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingUser = signal<UserBackend | null>(null);
  readonly showRolesModal = signal(false);
  readonly selectedUser = signal<UserBackend | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly total = signal(0);

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all'],
  });

  readonly userForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly autoGeneratePassword = signal(false);
  readonly generatedPasswordData = signal<{ password: string; email: string } | null>(null);

  readonly filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    { initialValue: this.filterForm.value }
  );

  readonly filteredUsers = computed(() => {
    const search = this.filterValues().search?.toLowerCase() || '';
    const status = this.filterValues().status || 'all';
    let filtered = this.users();

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    if (status === 'active') {
      filtered = filtered.filter((u) => u.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter((u) => !u.isActive);
    }

    return filtered;
  });

  readonly activeCount = computed(() => this.users().filter((u) => u.isActive).length);
  readonly inactiveCount = computed(() => this.users().filter((u) => !u.isActive).length);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.usersService.getUsers(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.total.set(response.total);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.isLoading.set(false);
      },
    });
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (response) => {
        this.availableRoles.set(response.roles);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
      },
    });
  }

  togglePanel(): void {
    this.panelOpen.update((open) => !open);
    if (!this.panelOpen()) {
      this.cancelEdit();
    }
  }

  editUser(user: UserBackend): void {
    this.editingUser.set(user);
    this.userForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    this.userForm.get('email')?.disable()
    // Hacer password opcional al editar
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.panelOpen.set(true);
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.autoGeneratePassword.set(false);
    this.userForm.reset({ firstName: '', lastName: '', email: '', password: '' });
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.errorMessage.set(null);
    this.panelOpen.set(false);
  }

  toggleAutoGeneratePassword(): void {
    this.autoGeneratePassword.update((value) => !value);
    const passwordControl = this.userForm.get('password');
    
    if (this.autoGeneratePassword()) {
      // Si auto-genera, password no es requerido
      passwordControl?.clearValidators();
      passwordControl?.setValue('');
    } else {
      // Si no auto-genera, password es requerido
      passwordControl?.setValidators([Validators.required, Validators.minLength(8)]);
    }
    passwordControl?.updateValueAndValidity();
  }

  submitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.userForm.getRawValue();

    if (this.editingUser()) {
      const updateData: UpdateUserRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
      };

      this.usersService.updateUser(this.editingUser()!.id, updateData).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Error al actualizar usuario');
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createData: CreateUserRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        password: this.autoGeneratePassword() ? undefined : formValue.password,
        autoGeneratePassword: this.autoGeneratePassword(),
      };

      this.usersService.createUser(createData).subscribe({
        next: (response) => {
          this.loadUsers();
          
          // Si se generó una contraseña, mostrarla en un modal
          if (response.generatedPassword) {
            this.generatedPasswordData.set({
              password: response.generatedPassword,
              email: formValue.email,
            });
          }
          
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Error al crear usuario');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  toggleUserStatus(user: UserBackend): void {
    if (!confirm(`¿Estás seguro de ${user.isActive ? 'desactivar' : 'activar'} a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.usersService.toggleActive(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        alert(error.message || 'Error al cambiar estado del usuario');
      },
    });
  }

  deleteUser(user: UserBackend): void {
    if (!confirm(`¿Estás seguro de eliminar a ${user.firstName} ${user.lastName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        alert(error.message || 'Error al eliminar usuario');
      },
    });
  }

  assignRoles(user: UserBackend): void {
    this.selectedUser.set(user);
    this.selectedRoleIds.set(user.roles.map((r) => r.id));
    this.showRolesModal.set(true);
  }

  closeRolesModal(): void {
    this.showRolesModal.set(false);
    this.selectedUser.set(null);
    this.selectedRoleIds.set([]);
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  toggleRole(roleId: string): void {
    const current = this.selectedRoleIds();
    if (current.includes(roleId)) {
      this.selectedRoleIds.set(current.filter((id) => id !== roleId));
    } else {
      this.selectedRoleIds.set([...current, roleId]);
    }
  }

  saveRoles(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.isSubmitting.set(true);

    this.usersService.assignRoles(user.id, this.selectedRoleIds()).subscribe({
      next: () => {
        this.loadUsers();
        this.closeRolesModal();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        alert(error.message || 'Error al asignar roles');
        this.isSubmitting.set(false);
      },
    });
  }

  getUserInitials(user: UserBackend): string {
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }

  copyPasswordToClipboard(): void {
    const password = this.generatedPasswordData()?.password;
    if (!password) return;

    navigator.clipboard.writeText(password).then(
      () => {
        alert('Contraseña copiada al portapapeles');
      },
      (err) => {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar la contraseña');
      }
    );
  }

  closeGeneratedPasswordModal(): void {
    this.generatedPasswordData.set(null);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadUsers();
    }
  }
}
