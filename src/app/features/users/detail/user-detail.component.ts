import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { UserBackend, UpdateUserRequest, RoleBasic } from '../../../core/models/user-backend.model';
import { Permission, Role } from '../../../core/models/role-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';
import { CatalogAssignModalComponent, CatalogAssignItem } from '../../../core/components/catalog-assign-modal.component';

type UserDetailTab = 'cuenta' | 'perfil' | 'permisos';

interface PermissionGroup {
  groupLabel: string;
  groupDescription: string | null;
  permissions: Permission[];
}

interface RoleSection {
  role: RoleBasic;
  groups: PermissionGroup[];
}

/** Agrupa permisos por `groupLabel` preservando el orden de llegada — mismo
 * criterio de agrupación que ya usan `roles.component.ts`/admin-permissions
 * (F31), aquí en modo exclusivamente lectura. */
function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  const byLabel = new Map<string, PermissionGroup>();
  for (const permission of permissions) {
    let group = byLabel.get(permission.groupLabel);
    if (!group) {
      group = { groupLabel: permission.groupLabel, groupDescription: permission.groupDescription, permissions: [] };
      byLabel.set(permission.groupLabel, group);
      groups.push(group);
    }
    group.permissions.push(permission);
  }
  return groups;
}

/**
 * F35 rediseño 2026-09-15: ficha del usuario con pestañas (mismo patrón que
 * `ClientDetailComponent`) en vez del modal único que crecía sin límite cada
 * vez que se agregaba un dato profesional nuevo. "Datos de la cuenta" y
 * "Perfil profesional" comparten un único formulario/endpoint (PUT
 * /users/:id, igual que antes); "Roles y permisos" es de solo lectura —
 * la asignación real de roles sigue viviendo en el modal "Asignar roles"
 * del listado de usuarios.
 */
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HasPermissionDirective, MultiSelectComponent, CatalogAssignModalComponent],
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (!user()) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">Usuario no encontrado</p>
        <a routerLink="/usuarios" class="mt-4 inline-block text-sm font-semibold text-navy-900">Volver al listado</a>
      </div>
    } @else {
      <div class="space-y-6">
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a routerLink="/usuarios" class="text-xs font-medium text-subtle hover:text-muted">&larr; Usuarios</a>
            <h2 class="text-2xl font-semibold text-text">{{ user()!.firstName }} {{ user()!.lastName }}</h2>
            <p class="text-sm text-subtle">{{ user()!.email }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @if (user()!.invitationStatus === 'PENDING') {
              <span class="inline-flex w-fit rounded-full bg-info-tint px-3 py-1 text-xs font-semibold text-info">
                Invitado
              </span>
            } @else if (user()!.invitationStatus === 'EXPIRED') {
              <span class="inline-flex w-fit rounded-full bg-warning-tint px-3 py-1 text-xs font-semibold text-warning">
                Invitación vencida
              </span>
            }
            @if (user()!.isAdvisor) {
              <span class="inline-flex w-fit rounded-full bg-navy-900/10 px-3 py-1 text-xs font-semibold text-navy-900">
                Asesor
              </span>
            }
            <span
              class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
              [class]="user()!.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
            >
              {{ user()!.isActive ? 'Activo' : 'Inactivo' }}
            </span>
            @if (user()!.invitationStatus === 'PENDING' || user()!.invitationStatus === 'EXPIRED') {
              <button
                *hasPermission="'users.create'"
                type="button"
                (click)="resendInvitation()"
                [disabled]="isResendingInvitation()"
                class="inline-flex items-center gap-1.5 rounded-md border border-info px-3 py-1.5 text-xs font-semibold text-info transition hover:bg-info-tint disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Reenviar invitación
              </button>
            }
          </div>
        </header>

        <nav class="flex flex-wrap gap-1 border-b border-default">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              class="rounded-t-md px-4 py-2 text-sm font-medium transition"
              [class]="activeTab() === tab.id
                ? 'border-b-2 border-navy-900 text-navy-900'
                : 'text-subtle hover:text-muted'"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        @switch (activeTab()) {
          @case ('cuenta') {
            <form [formGroup]="editForm" (ngSubmit)="saveUser()" class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
              @if (!canEdit()) {
                <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
                  No tienes permiso para editar los datos de este usuario.
                </div>
              }

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="text-sm text-muted">
                  Nombre
                  <input
                    formControlName="firstName"
                    type="text"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                  @if (editForm.get('firstName')?.touched && editForm.get('firstName')?.invalid) {
                    <p class="mt-1 text-xs text-danger">Campo requerido</p>
                  }
                </label>
                <label class="text-sm text-muted">
                  Apellido
                  <input
                    formControlName="lastName"
                    type="text"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                  @if (editForm.get('lastName')?.touched && editForm.get('lastName')?.invalid) {
                    <p class="mt-1 text-xs text-danger">Campo requerido</p>
                  }
                </label>
              </div>

              <label class="text-sm text-muted">
                Email
                <input
                  formControlName="email"
                  type="email"
                  autocomplete="off"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                />
                @if (editForm.get('email')?.touched && editForm.get('email')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Email inválido</p>
                }
                @if (canEdit() && editingUserHasLoggedIn()) {
                  <p class="mt-1 text-xs text-subtle">
                    El email no puede modificarse porque el usuario ya inició sesión (es su identificador de acceso)
                  </p>
                } @else if (canEdit()) {
                  <p class="mt-1 text-xs text-success">
                    El email puede modificarse porque el usuario aún no ha iniciado sesión
                  </p>
                }
              </label>

              @if (errorMessage()) {
                <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  {{ errorMessage() }}
                </div>
              }

              <button
                *hasPermission="'users.edit'"
                type="submit"
                class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving() || editForm.invalid"
              >
                Guardar cambios
              </button>
            </form>
          }
          @case ('perfil') {
            <form [formGroup]="editForm" (ngSubmit)="saveUser()" class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
              @if (!canEdit()) {
                <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
                  No tienes permiso para editar el perfil profesional de este usuario.
                </div>
              }

              <div>
                <label class="inline-flex cursor-pointer items-center gap-3">
                  <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
                    <input type="checkbox" formControlName="isAdvisor" class="peer sr-only" />
                    <span
                      class="absolute inset-0 rounded-full bg-strong transition-colors peer-checked:bg-navy-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                    ></span>
                    <span
                      class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
                    ></span>
                  </span>
                  <span class="text-sm font-semibold text-text">Es asesor legal</span>
                </label>
              </div>

              @if (editForm.get('isAdvisor')?.value) {
                <div class="grid gap-4 border-t border-default pt-4">
                  <div class="text-sm text-muted">
                    @if (canEdit()) {
                      <app-multi-select
                        [items]="specialtyItems()"
                        [selectedIds]="editForm.get('specialtyIds')?.value || []"
                        label="Especialidades"
                        placeholder="Buscar especialidad…"
                        emptyStateText="No hay especialidades disponibles"
                        (selectionChange)="editForm.patchValue({ specialtyIds: $event })"
                      />
                      <p class="mt-1 text-xs text-subtle">
                        Si no seleccionas ninguna, se asigna la especialidad predeterminada.
                      </p>
                    } @else {
                      <span class="mb-2 block text-xs font-medium text-subtle">Especialidades</span>
                      <div class="flex flex-wrap gap-1">
                        @for (specialtyId of editForm.get('specialtyIds')?.value || []; track specialtyId) {
                          <span class="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-text">
                            {{ specialtyLabel(specialtyId) }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Teléfono de contacto
                      <input
                        formControlName="advisorPhone"
                        type="text"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                      />
                    </label>
                    <label class="text-sm text-muted">
                      Celular secundario
                      <input
                        formControlName="mobileSecondary"
                        type="text"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                      />
                    </label>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Tarjeta profesional
                      <input
                        formControlName="professionalCard"
                        type="text"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                      />
                    </label>
                    <label class="text-sm text-muted">
                      Años de experiencia
                      <input
                        formControlName="experienceYears"
                        type="number"
                        min="0"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                      />
                    </label>
                  </div>
                </div>
              }

              @if (errorMessage()) {
                <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  {{ errorMessage() }}
                </div>
              }

              <button
                *hasPermission="'users.edit'"
                type="submit"
                class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving() || editForm.invalid"
              >
                Guardar cambios
              </button>
            </form>
          }
          @case ('permisos') {
            <div class="space-y-4">
              <div class="flex justify-end">
                <button
                  *hasPermission="'users.assign-roles'"
                  type="button"
                  (click)="openRolesModal()"
                  class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
                >
                  Asignar roles
                </button>
              </div>
              @if (isLoadingPermissions()) {
                <div class="flex items-center justify-center py-12">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                </div>
              } @else if (roleSections().length === 0) {
                <div class="rounded-lg border border-default bg-surface p-12 text-center">
                  <p class="text-subtle">Este usuario no tiene roles asignados.</p>
                </div>
              } @else {
                @for (section of roleSections(); track section.role.id) {
                  <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
                    <h3 class="mb-4 text-sm font-semibold text-text">Rol: {{ section.role.name }}</h3>
                    @if (section.groups.length === 0) {
                      <p class="text-sm text-subtle">Este rol no tiene permisos asignados.</p>
                    } @else {
                      <div class="grid gap-4 sm:grid-cols-2">
                        @for (group of section.groups; track group.groupLabel) {
                          <div class="rounded-md border border-default bg-surface-muted p-3">
                            <p class="text-xs font-semibold uppercase tracking-wide text-subtle">{{ group.groupLabel }}</p>
                            <ul class="mt-2 space-y-1">
                              @for (permission of group.permissions; track permission.id) {
                                <li class="text-sm text-muted">{{ permission.label }}</li>
                              }
                            </ul>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
              <p class="text-xs text-subtle">
                Los permisos que otorga cada rol son de solo lectura — usa "Asignar roles" para cambiar qué roles tiene este usuario.
              </p>
            </div>
          }
        }
      </div>

      <app-catalog-assign-modal
        title="Asignar roles"
        subtitlePrefix="Usuario:"
        [subtitleValue]="user()!.firstName + ' ' + user()!.lastName"
        [items]="roleCatalogItems()"
        [selectedIds]="selectedRoleIds()"
        [isOpen]="showRolesModal()"
        [isSubmitting]="isAssigningRoles()"
        submitLabel="Guardar roles"
        (cancel)="closeRolesModal()"
        (save)="saveRoles($event)"
      />
    }
  `,
})
export class UserDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly permissions = inject(PermissionsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly tabs: { id: UserDetailTab; label: string }[] = [
    { id: 'cuenta', label: 'Datos de la cuenta' },
    { id: 'perfil', label: 'Perfil profesional' },
    { id: 'permisos', label: 'Roles y permisos' },
  ];
  readonly activeTab = signal<UserDetailTab>('cuenta');

  readonly user = signal<UserBackend | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isResendingInvitation = signal(false);

  readonly specialties = signal<CatalogItem[]>([]);
  readonly roleSections = signal<RoleSection[]>([]);
  readonly isLoadingPermissions = signal(false);

  // Ficha "Roles y permisos" (QA 2026-09-15): además de la vista de solo
  // lectura, permite abrir el mismo modal "Asignar roles" que ya existe en
  // el listado — completa la ficha como punto único de gestión del usuario.
  readonly availableRoles = signal<Role[]>([]);
  readonly showRolesModal = signal(false);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly isAssigningRoles = signal(false);

  readonly canEdit = computed(() => this.permissions.hasPermission('users.edit'));
  readonly editingUserHasLoggedIn = computed(() => !!this.user()?.lastLoginAt);

  readonly specialtyItems = computed<MultiSelectItem[]>(() =>
    this.specialties().map((item) => ({ id: item.id, label: item.label })),
  );

  readonly roleCatalogItems = computed<CatalogAssignItem[]>(() =>
    this.availableRoles().map((role) => ({
      id: role.id,
      label: role.name,
      description: role.description,
    })),
  );

  readonly editForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    isAdvisor: [false],
    specialtyIds: [[] as string[]],
    advisorPhone: [''],
    professionalCard: [''],
    mobileSecondary: [''],
    experienceYears: [0],
  });

  // BUG-14/QA F33 2026-09-14: el deshabilitado real va sobre el FormControl
  // — nunca [attr.disabled] junto a formControlName (Reactive Forms pisa esa
  // propiedad en cada ciclo de detección de cambios).
  private readonly alwaysGatedFieldNames = [
    'firstName',
    'lastName',
    'isAdvisor',
    'advisorPhone',
    'professionalCard',
    'mobileSecondary',
    'experienceYears',
  ] as const;

  constructor() {
    effect(() => {
      const canEdit = this.canEdit();
      for (const name of this.alwaysGatedFieldNames) {
        const control = this.editForm.get(name);
        if (!control) continue;
        if (canEdit) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
      }
    });
    effect(() => {
      const canEditEmail = this.canEdit() && !this.editingUserHasLoggedIn();
      const control = this.editForm.get('email');
      if (!control) return;
      if (canEditEmail) control.enable({ emitEvent: false });
      else control.disable({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }
    this.loadSpecialties();
    this.loadRoles();
    this.loadUser(id);
  }

  private loadSpecialties(): void {
    this.catalogsService.getActiveCatalog('advisor_specialty').subscribe({
      next: (items) => this.specialties.set(items),
      error: (error) => console.error('Error al cargar especialidades:', error),
    });
  }

  private loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (response) => this.availableRoles.set(response.roles),
      error: (error) => console.error('Error al cargar roles:', error),
    });
  }

  openRolesModal(): void {
    const currentUser = this.user();
    if (!currentUser) return;
    this.selectedRoleIds.set(currentUser.roles.map((r) => r.id));
    this.showRolesModal.set(true);
  }

  closeRolesModal(): void {
    this.showRolesModal.set(false);
    this.selectedRoleIds.set([]);
  }

  saveRoles(roleIds: string[]): void {
    const currentUser = this.user();
    if (!currentUser || this.isAssigningRoles()) {
      return;
    }
    this.isAssigningRoles.set(true);

    this.usersService.assignRoles(currentUser.id, roleIds).subscribe({
      next: (response) => {
        this.user.set(response.user);
        this.loadRolePermissions(response.user.roles);
        this.toast.success('Roles asignados exitosamente');
        this.closeRolesModal();
        this.isAssigningRoles.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al asignar roles');
        this.isAssigningRoles.set(false);
      },
    });
  }

  specialtyLabel(id: string): string {
    return this.specialties().find((s) => s.id === id)?.label || id;
  }

  /** QA 2026-09-15: mismo botón que ya existía en la tabla de usuarios
   * (`users-table.component.ts`) para invitaciones PENDING/EXPIRED — ahora
   * también disponible desde la ficha, ya que "Editar" navega aquí en vez
   * de abrir el panel inline. */
  resendInvitation(): void {
    const currentUser = this.user();
    if (!currentUser || this.isResendingInvitation()) {
      return;
    }
    this.isResendingInvitation.set(true);
    this.usersService.resendInvitation(currentUser.id).subscribe({
      next: (response) => {
        this.toast.success(response.message || `Invitación reenviada a ${currentUser.email}`);
        this.isResendingInvitation.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al reenviar la invitación');
        this.isResendingInvitation.set(false);
      },
    });
  }

  private loadUser(id: string): void {
    this.isLoading.set(true);
    this.usersService.getUserById(id).subscribe({
      next: (response) => {
        const user = response.user;
        this.user.set(user);
        this.editForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isAdvisor: user.isAdvisor,
          specialtyIds: user.advisorProfile?.specialties.map((s) => s.id) ?? [],
          advisorPhone: user.advisorProfile?.advisorPhone ?? '',
          professionalCard: user.advisorProfile?.professionalCard ?? '',
          mobileSecondary: user.advisorProfile?.mobileSecondary ?? '',
          experienceYears: user.advisorProfile?.experienceYears ?? 0,
        });
        this.isLoading.set(false);
        this.loadRolePermissions(user.roles);
      },
      error: () => {
        this.user.set(null);
        this.isLoading.set(false);
      },
    });
  }

  /** Carga los permisos de cada rol asignado (solo lectura) — no hay un
   * endpoint que devuelva permisos ya embebidos en `GET /users/:id`. */
  private loadRolePermissions(roles: RoleBasic[]): void {
    if (roles.length === 0) {
      this.roleSections.set([]);
      return;
    }
    this.isLoadingPermissions.set(true);
    const sections: RoleSection[] = new Array(roles.length);
    let remaining = roles.length;
    roles.forEach((role, index) => {
      this.rolesService.getRolePermissions(role.id).subscribe({
        next: (response) => {
          sections[index] = { role, groups: groupPermissions(response.permissions) };
          remaining -= 1;
          if (remaining === 0) {
            this.roleSections.set(sections);
            this.isLoadingPermissions.set(false);
          }
        },
        error: () => {
          sections[index] = { role, groups: [] };
          remaining -= 1;
          if (remaining === 0) {
            this.roleSections.set(sections);
            this.isLoadingPermissions.set(false);
          }
        },
      });
    });
  }

  async saveUser(): Promise<void> {
    const currentUser = this.user();
    if (!currentUser || this.isSaving()) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toast.error('Hay campos obligatorios sin completar en la pestaña Datos de la cuenta');
      this.activeTab.set('cuenta');
      return;
    }

    // BUG (2026-09-15): destildar "Es asesor legal" quitaba el perfil de
    // asesor sin ninguna advertencia, incluso si el usuario estaba asignado
    // a procesos activos — el backend ahora bloquea el caso de mayor riesgo
    // (único asesor de un proceso activo) y registra el cambio en el
    // timeline cuando lo permite, pero esta confirmación es la advertencia
    // previa que pidió el reporte, antes de intentar el guardado.
    const removingAdvisorProfile =
      currentUser.isAdvisor && !this.editForm.get('isAdvisor')?.value;
    if (removingAdvisorProfile) {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Quitar perfil de asesor legal',
        message:
          'Este usuario dejará de figurar como asesor legal. Si está asignado a procesos activos, el cambio puede afectarlos y quedará registrado en su historial. ¿Deseas continuar?',
        confirmLabel: 'Quitar perfil de asesor',
        cancelLabel: 'Cancelar',
        danger: true,
      });
      if (!confirmed) {
        return;
      }
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const formValue = this.editForm.getRawValue();

    const advisorFields = formValue.isAdvisor
      ? {
          isAdvisor: true,
          specialtyIds: formValue.specialtyIds.length > 0 ? formValue.specialtyIds : undefined,
          advisorPhone: formValue.advisorPhone || undefined,
          professionalCard: formValue.professionalCard || undefined,
          mobileSecondary: formValue.mobileSecondary || undefined,
          experienceYears: formValue.experienceYears,
        }
      : { isAdvisor: false };

    const updateData: UpdateUserRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      ...advisorFields,
    };

    this.usersService.updateUser(currentUser.id, updateData).subscribe({
      next: (response) => {
        this.user.set(response.user);
        this.toast.success('Usuario actualizado exitosamente');
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = error.message || 'Error al actualizar usuario';
        this.errorMessage.set(message);
        this.toast.error(message);
        this.isSaving.set(false);
      },
    });
  }
}
