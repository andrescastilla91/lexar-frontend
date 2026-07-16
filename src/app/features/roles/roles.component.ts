import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RolesService } from '../../core/services/roles.service';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '../../core/models/role-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CatalogAssignModalComponent, CatalogAssignItem } from '../../core/components/catalog-assign-modal.component';
import { RoleFormComponent } from './components/role-form.component';
import { RolesTableComponent } from './components/roles-table.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [HasPermissionDirective, CatalogAssignModalComponent, RoleFormComponent, RolesTableComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Gestión de roles</h2>
          <p class="text-sm text-subtle">Define roles y asigna permisos específicos a cada equipo.</p>
        </div>
        <button
          *hasPermission="'roles.create'"
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo rol
        </button>
      </header>

      <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
            <p class="text-xs text-subtle">Total roles</p>
            <p class="text-2xl font-semibold text-text">{{ roles().length }}</p>
          </div>
          <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
            <p class="text-xs text-subtle">Roles del sistema</p>
            <p class="text-2xl font-semibold text-info">{{ systemRolesCount() }}</p>
          </div>
          <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
            <p class="text-xs text-subtle">Roles personalizados</p>
            <p class="text-2xl font-semibold text-success">{{ customRolesCount() }}</p>
          </div>
        </div>
      </div>

      <app-role-form
        [form]="roleForm"
        [isOpen]="panelOpen()"
        [isEditing]="!!editingRole()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        (cancel)="cancelEdit()"
        (submit)="submitRole()"
      />

      <app-roles-table
        [roles]="roles()"
        [isLoading]="isLoading()"
        (edit)="editRole($event)"
        (managePermissions)="managePermissions($event)"
        (delete)="deleteRole($event)"
      />

      <app-catalog-assign-modal
        title="Gestionar permisos"
        subtitlePrefix="Rol:"
        [subtitleValue]="selectedRole()?.name ?? null"
        [items]="permissionCatalogItems()"
        [selectedIds]="selectedPermissionIds()"
        [isOpen]="showPermissionsModal()"
        [isSubmitting]="isSubmitting()"
        submitLabel="Guardar permisos"
        (cancel)="closePermissionsModal()"
        (save)="savePermissions($event)"
      />
    </div>
  `,
})
export class RolesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesService);
  private readonly confirmDialog = inject(ConfirmDialogService);

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

  readonly permissionCatalogItems = computed<CatalogAssignItem[]>(() =>
    this.allPermissions().map((permission) => {
      const parts = permission.code.split('.');
      const module = parts.length > 1 ? parts[0] : 'General';
      return {
        id: permission.id,
        label: permission.code,
        description: permission.description,
        group: module,
      };
    })
  );

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
    if (this.isSubmitting()) {
      return;
    }

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

  async deleteRole(role: Role): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar rol',
      message: `¿Estás seguro de eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!confirmed) {
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

  savePermissions(permissionIds: string[]): void {
    if (this.isSubmitting()) {
      return;
    }

    const role = this.selectedRole();
    if (!role) return;

    this.isSubmitting.set(true);

    this.rolesService.assignPermissions(role.id, permissionIds).subscribe({
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
