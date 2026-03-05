import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { RolesService } from '../../core/services/roles.service';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '../../core/models/role-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800">Gestión de roles</h2>
          <p class="text-sm text-slate-500">Define roles y asigna permisos específicos a cada equipo.</p>
        </div>
        <button
          *hasPermission="'roles.create'"
          type="button"
          class="flex items-center gap-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111728]"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo rol
        </button>
      </header>

      <!-- Stats -->
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Total roles</p>
            <p class="text-2xl font-semibold text-slate-800">{{ roles().length }}</p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Roles del sistema</p>
            <p class="text-2xl font-semibold text-sky-600">{{ systemRolesCount() }}</p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p class="text-xs text-slate-500">Roles personalizados</p>
            <p class="text-2xl font-semibold text-emerald-600">{{ customRolesCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Modal para crear/editar rol -->
      @if (panelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            class="w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            style="max-height: 90vh"
            [formGroup]="roleForm"
            (ngSubmit)="submitRole()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-800">
                {{ editingRole() ? 'Editar rol' : 'Nuevo rol' }}
              </h3>
              <button
                type="button"
                (click)="cancelEdit()"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="grid gap-4">
              <label class="text-sm text-slate-600">
                Nombre del rol
                <input
                  formControlName="name"
                  type="text"
                  placeholder="Ej: Coordinador Legal"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                />
                @if (roleForm.get('name')?.touched && roleForm.get('name')?.invalid) {
                  <p class="mt-1 text-xs text-rose-500">Campo requerido</p>
                }
              </label>

              <label class="text-sm text-slate-600">
                Descripción (opcional)
                <textarea
                  formControlName="description"
                  rows="3"
                  placeholder="Describe las responsabilidades de este rol"
                  class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                ></textarea>
              </label>
            </div>

            @if (errorMessage()) {
              <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {{ errorMessage() }}
              </div>
            }

            <div class="mt-6 flex gap-3">
              <button
                type="button"
                (click)="cancelEdit()"
                class="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 rounded-2xl bg-[#192033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111728] disabled:bg-slate-400"
                [disabled]="isSubmitting() || roleForm.invalid"
              >
                {{ editingRole() ? 'Actualizar' : 'Crear rol' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#192033]"></div>
        </div>
      } @else if (roles().length === 0) {
        <div class="rounded-3xl border border-slate-200 bg-white p-12 text-center">
          <p class="text-slate-500">No se encontraron roles</p>
        </div>
      } @else {
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          @for (role of roles(); track role.id) {
            <article class="flex min-h-[280px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div class="mb-3">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-slate-800">{{ role.name }}</h3>
                  @if (role.isSystem) {
                    <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      Sistema
                    </span>
                  }
                </div>
              </div>

              <div class="mb-4 flex-grow">
                @if (role.description) {
                  <p class="text-sm text-slate-500">{{ role.description }}</p>
                } @else {
                  <p class="text-sm italic text-slate-400">Sin descripción</p>
                }
              </div>

              <div class="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p class="text-xs font-medium text-slate-600">Permisos asignados</p>
                <p class="mt-1 text-2xl font-semibold text-slate-800">
                  {{ role.permissions?.length || 0 }}
                </p>
              </div>

              <div class="mt-auto flex gap-2">
                <button
                  *hasPermission="'roles.edit'"
                  type="button"
                  (click)="editRole(role)"
                  class="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  [disabled]="role.isSystem"
                  [class.opacity-50]="role.isSystem"
                  [class.cursor-not-allowed]="role.isSystem"
                >
                  Editar
                </button>
                <button
                  *hasPermission="'roles.assign-permissions'"
                  type="button"
                  (click)="managePermissions(role)"
                  class="flex-1 rounded-2xl bg-[#192033] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#111728]"
                >
                  Permisos
                </button>
                <button
                  *hasPermission="'roles.delete'"
                  type="button"
                  (click)="deleteRole(role)"
                  class="rounded-2xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
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

      @if (showPermissionsModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div class="w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" style="max-height: 90vh">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-800">Gestionar permisos</h3>
              <button
                type="button"
                (click)="closePermissionsModal()"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p class="mb-4 text-sm text-slate-600">
              Rol: <strong>{{ selectedRole()?.name }}</strong>
            </p>

            <div class="mb-6 space-y-4">
              @for (module of permissionsByModule(); track module.name) {
                <div class="rounded-2xl border border-slate-200 p-4">
                  <h4 class="mb-3 font-semibold text-slate-800">{{ module.name }}</h4>
                  <div class="grid gap-2 sm:grid-cols-2">
                    @for (permission of module.permissions; track permission.id) {
                      <label class="flex items-start gap-2 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          [checked]="isPermissionSelected(permission.id)"
                          (change)="togglePermission(permission.id)"
                          class="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#192033] focus:ring-[#192033]"
                        />
                        <div class="flex-1">
                          <p class="text-sm font-medium text-slate-700">{{ permission.code }}</p>
                          @if (permission.description) {
                            <p class="text-xs text-slate-500">{{ permission.description }}</p>
                          }
                        </div>
                      </label>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="closePermissionsModal()"
                class="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="savePermissions()"
                class="flex-1 rounded-2xl bg-[#192033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111728]"
                [disabled]="isSubmitting()"
              >
                Guardar permisos
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RolesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesService);

  readonly roles = signal<Role[]>([]);
  readonly allPermissions = signal<Permission[]>([]);
  readonly selectedPermissionIds = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingRole = signal<Role | null>(null);
  readonly showPermissionsModal = signal(false);
  readonly selectedRole = signal<Role | null>(null);

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  readonly systemRolesCount = computed(() => this.roles().filter((r) => r.isSystem).length);
  readonly customRolesCount = computed(() => this.roles().filter((r) => !r.isSystem).length);

  readonly permissionsByModule = computed(() => {
    const permissions = this.allPermissions();
    const grouped = new Map<string, Permission[]>();

    permissions.forEach((permission) => {
      // Extraer el módulo del code (formato: "module.action")
      const parts = permission.code.split('.');
      const module = parts.length > 1 ? parts[0] : 'General';
      
      if (!grouped.has(module)) {
        grouped.set(module, []);
      }
      grouped.get(module)!.push(permission);
    });

    return Array.from(grouped.entries()).map(([name, permissions]) => ({
      name,
      permissions,
    }));
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadAllPermissions();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.rolesService.getRoles().subscribe({
      next: (response) => {
        this.roles.set(response.roles);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.isLoading.set(false);
      },
    });
  }

  loadAllPermissions(): void {
    this.rolesService.getAllPermissions().subscribe({
      next: (response) => {
        this.allPermissions.set(response.permissions);
      },
      error: (error) => {
        console.error('Error al cargar permisos:', error);
      },
    });
  }

  togglePanel(): void {
    this.panelOpen.update((open) => !open);
    if (!this.panelOpen()) {
      this.cancelEdit();
    }
  }

  editRole(role: Role): void {
    this.editingRole.set(role);
    this.roleForm.patchValue({
      name: role.name,
      description: role.description || '',
    });
    this.panelOpen.set(true);
  }

  cancelEdit(): void {
    this.editingRole.set(null);
    this.roleForm.reset({ name: '', description: '' });
    this.errorMessage.set(null);
    this.panelOpen.set(false);
  }

  submitRole(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.roleForm.getRawValue();

    if (this.editingRole()) {
      const updateData: UpdateRoleRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
      };

      this.rolesService.updateRole(this.editingRole()!.id, updateData).subscribe({
        next: () => {
          this.loadRoles();
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al actualizar rol');
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createData: CreateRoleRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
      };

      this.rolesService.createRole(createData).subscribe({
        next: () => {
          this.loadRoles();
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al crear rol');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  deleteRole(role: Role): void {
    if (!confirm(`¿Estás seguro de eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.rolesService.deleteRole(role.id).subscribe({
      next: () => {
        this.loadRoles();
      },
      error: (error) => {
        alert(error.message || 'Error al eliminar rol');
      },
    });
  }

  managePermissions(role: Role): void {
    this.selectedRole.set(role);
    
    // Cargar permisos actuales del rol
    this.rolesService.getRolePermissions(role.id).subscribe({
      next: (response) => {
        this.selectedPermissionIds.set(response.permissions.map((p) => p.id));
        this.showPermissionsModal.set(true);
      },
      error: (error) => {
        alert(error.message || 'Error al cargar permisos del rol');
      },
    });
  }

  closePermissionsModal(): void {
    this.showPermissionsModal.set(false);
    this.selectedRole.set(null);
    this.selectedPermissionIds.set([]);
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().includes(permissionId);
  }

  togglePermission(permissionId: string): void {
    const current = this.selectedPermissionIds();
    if (current.includes(permissionId)) {
      this.selectedPermissionIds.set(current.filter((id) => id !== permissionId));
    } else {
      this.selectedPermissionIds.set([...current, permissionId]);
    }
  }

  savePermissions(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.isSubmitting.set(true);

    this.rolesService.assignPermissions(role.id, this.selectedPermissionIds()).subscribe({
      next: () => {
        this.loadRoles();
        this.closePermissionsModal();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        alert(error.message || 'Error al asignar permisos');
        this.isSubmitting.set(false);
      },
    });
  }
}
