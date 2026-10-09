import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CatalogAssignItem, CatalogAssignModalComponent } from '../../../core/components/catalog-assign-modal.component';
import { RoleFormComponent } from '../../roles/components/role-form.component';
import { Role } from '../../../core/models/role-backend.model';
import { RolesService } from '../../../core/services/roles.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * F39 (ROL-01): modal "Asignar roles" compartido por la lista y la ficha de
 * usuario. Además de elegir roles existentes, quien tenga `roles.create`
 * puede crear un rol nuevo sin salir del flujo: el rol queda creado (sin
 * permisos — se configuran luego en Roles), se agrega al catálogo del modal y
 * se preselecciona, conservando lo que ya se había marcado. Asignarlo al
 * usuario sigue siendo un paso explícito ("Guardar roles").
 */
@Component({
  selector: 'app-assign-roles-modal',
  standalone: true,
  imports: [CatalogAssignModalComponent, RoleFormComponent],
  template: `
    <app-catalog-assign-modal
      title="Asignar roles"
      subtitlePrefix="Usuario:"
      [subtitleValue]="userName()"
      [items]="items()"
      [selectedIds]="effectiveSelectedIds()"
      [isOpen]="isOpen()"
      [isSubmitting]="isSubmitting()"
      submitLabel="Guardar roles"
      [createActionLabel]="canCreateRole() ? 'Crear rol nuevo' : null"
      (createRequested)="openCreateForm($event)"
      (cancel)="cancel.emit()"
      (save)="save.emit($event)"
    />

    <app-role-form
      [form]="roleForm"
      [isOpen]="showCreateForm()"
      [isEditing]="false"
      [isSubmitting]="isCreating()"
      [errorMessage]="createError()"
      (cancel)="closeCreateForm()"
      (submit)="submitCreate()"
    />
  `,
})
export class AssignRolesModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly rolesService = inject(RolesService);
  private readonly permissions = inject(PermissionsService);
  private readonly toast = inject(ToastService);

  roles = input.required<Role[]>();
  selectedIds = input.required<string[]>();
  isOpen = input(false);
  isSubmitting = input(false);
  userName = input<string | null>(null);

  save = output<string[]>();
  cancel = output<void>();
  /** El padre agrega el rol recién creado a su catálogo de roles. */
  roleCreated = output<Role>();

  readonly showCreateForm = signal(false);
  readonly isCreating = signal(false);
  readonly createError = signal<string | null>(null);
  // Selección vigente cuando el usuario salta a "Crear rol nuevo"; tras crear
  // se le suma el rol nuevo. Se descarta al cerrar el modal.
  private readonly selectionOverride = signal<string[] | null>(null);

  readonly roleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  readonly canCreateRole = computed(() => this.permissions.userPermissions().includes('roles.create'));

  readonly items = computed<CatalogAssignItem[]>(() =>
    this.roles().map((role) => ({ id: role.id, label: role.name, description: role.description })),
  );

  readonly effectiveSelectedIds = computed(() => this.selectionOverride() ?? this.selectedIds());

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.selectionOverride.set(null);
        this.closeCreateForm();
      }
    });
  }

  openCreateForm(currentSelection: string[]): void {
    this.selectionOverride.set(currentSelection);
    this.createError.set(null);
    this.roleForm.reset({ name: '', description: '' });
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.createError.set(null);
    this.roleForm.reset({ name: '', description: '' });
  }

  submitCreate(): void {
    if (this.isCreating()) {
      return;
    }
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }
    this.isCreating.set(true);
    this.createError.set(null);
    const { name, description } = this.roleForm.getRawValue();

    this.rolesService.createRole({ name, description: description || undefined }).subscribe({
      next: (response) => {
        const created = response.role;
        this.selectionOverride.update((current) => [...(current ?? this.selectedIds()), created.id]);
        this.roleCreated.emit(created);
        this.toast.success(`Rol "${created.name}" creado y seleccionado. Guarda los roles para asignarlo.`);
        this.closeCreateForm();
        this.isCreating.set(false);
      },
      error: (error: { message?: string }) => {
        this.createError.set(error.message || 'Error al crear rol');
        this.isCreating.set(false);
      },
    });
  }
}
