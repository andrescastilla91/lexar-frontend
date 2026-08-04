import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { UserBackend, CreateUserRequest, UpdateUserRequest } from '../../core/models/user-backend.model';
import { Role } from '../../core/models/role-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../core/components/pagination.component';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { CatalogAssignModalComponent, CatalogAssignItem } from '../../core/components/catalog-assign-modal.component';
import { UserFormComponent } from './components/user-form.component';
import { UsersTableComponent } from './components/users-table.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HasPermissionDirective,
    PaginationComponent,
    CatalogAssignModalComponent,
    UserFormComponent,
    UsersTableComponent,
  ],
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

      <app-user-form
        [form]="userForm"
        [isOpen]="panelOpen()"
        [isEditing]="!!editingUser()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        [editingUserHasLoggedIn]="editingUserHasLoggedIn()"
        (formCancel)="cancelEdit()"
        (formSubmit)="submitUser()"
      />

      <app-users-table
        [users]="filteredUsers()"
        [isLoading]="isLoading()"
        (edit)="editUser($event)"
        (toggleStatus)="toggleUserStatus($event)"
        (assignRoles)="assignRoles($event)"
        (resendInvitation)="resendInvitation($event)"
        (disableTwoFactor)="disableUserTwoFactor($event)"
      />

      @if (!isLoading() && filteredUsers().length > 0) {
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

      <app-catalog-assign-modal
        title="Asignar roles"
        subtitlePrefix="Usuario:"
        [subtitleValue]="selectedUserFullName()"
        [items]="roleCatalogItems()"
        [selectedIds]="selectedRoleIds()"
        [isOpen]="showRolesModal()"
        [isSubmitting]="isSubmitting()"
        submitLabel="Guardar roles"
        (cancel)="closeRolesModal()"
        (save)="saveRoles($event)"
      />
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toastService = inject(ToastService);

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
  });

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

  readonly editingUserHasLoggedIn = computed(() => !!this.editingUser()?.lastLoginAt);

  readonly selectedUserFullName = computed(() => {
    const user = this.selectedUser();
    return user ? `${user.firstName} ${user.lastName}` : null;
  });

  readonly roleCatalogItems = computed<CatalogAssignItem[]>(() =>
    this.availableRoles().map((role) => ({
      id: role.id,
      label: role.name,
      description: role.description,
    }))
  );

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
    this.usersService.getUserById(user.id).subscribe({
      next: (response) => {
        const freshUser = response.user;
        this.editingUser.set(freshUser);
        this.userForm.patchValue({
          firstName: freshUser.firstName,
          lastName: freshUser.lastName,
          email: freshUser.email,
        });
        if (freshUser.lastLoginAt) {
          this.userForm.get('email')?.disable();
        } else {
          this.userForm.get('email')?.enable();
        }
        this.panelOpen.set(true);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al cargar el usuario');
      },
    });
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.userForm.reset({ firstName: '', lastName: '', email: '' });
    this.userForm.get('email')?.enable();
    this.errorMessage.set(null);
    this.panelOpen.set(false);
  }

  submitUser(): void {
    if (this.isSubmitting()) {
      return;
    }

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
          this.toastService.success('Usuario actualizado exitosamente');
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          const message = error.error?.message || 'Error al actualizar usuario';
          this.errorMessage.set(message);
          this.toastService.error(message);
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createData: CreateUserRequest = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
      };

      this.usersService.createUser(createData).subscribe({
        next: (response) => {
          this.loadUsers();
          this.toastService.success(response.message || `Invitación enviada a ${formValue.email}`);
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          const message = error.error?.message || 'Error al enviar la invitación';
          this.errorMessage.set(message);
          this.toastService.error(message);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  async toggleUserStatus(user: UserBackend): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: user.isActive ? 'Desactivar usuario' : 'Activar usuario',
      message: `¿Estás seguro de ${user.isActive ? 'desactivar' : 'activar'} a ${user.firstName} ${user.lastName}?`,
      danger: user.isActive,
    });
    if (!confirmed) {
      return;
    }

    this.usersService.toggleActive(user.id).subscribe({
      next: () => {
        this.loadUsers();
        this.toastService.success(
          user.isActive ? 'Usuario desactivado exitosamente' : 'Usuario activado exitosamente',
        );
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al cambiar estado del usuario');
      },
    });
  }

  async disableUserTwoFactor(user: UserBackend): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Desactivar verificación en dos pasos',
      message: `¿Estás seguro de desactivar el segundo factor de ${user.firstName} ${user.lastName}? Tendrá que activarlo de nuevo desde su perfil.`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.usersService.disableTwoFactor(user.id).subscribe({
      next: () => {
        this.loadUsers();
        this.toastService.success('Verificación en dos pasos desactivada exitosamente');
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al desactivar la verificación en dos pasos');
      },
    });
  }

  resendInvitation(user: UserBackend): void {
    this.usersService.resendInvitation(user.id).subscribe({
      next: (response) => {
        this.loadUsers();
        this.toastService.success(response.message || `Invitación reenviada a ${user.email}`);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al reenviar la invitación');
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

  saveRoles(roleIds: string[]): void {
    if (this.isSubmitting()) {
      return;
    }

    const user = this.selectedUser();
    if (!user) return;

    this.isSubmitting.set(true);

    this.usersService.assignRoles(user.id, roleIds).subscribe({
      next: () => {
        this.loadUsers();
        this.toastService.success('Roles asignados exitosamente');
        this.closeRolesModal();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || 'Error al asignar roles');
        this.isSubmitting.set(false);
      },
    });
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
