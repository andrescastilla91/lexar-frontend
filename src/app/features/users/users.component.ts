import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { UserBackend, CreateUserRequest } from '../../core/models/user-backend.model';
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
        <button
          type="button"
          class="flex w-full items-center justify-between py-2 text-sm font-medium text-muted sm:hidden"
          [class.mb-4]="filtersOpen()"
          (click)="filtersOpen.set(!filtersOpen())"
        >
          <span>Filtros y resumen</span>
          <svg
            class="h-4 w-4 transition-transform"
            [class.rotate-180]="filtersOpen()"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <form [formGroup]="filterForm" class="space-y-4 sm:block" [class.hidden]="!filtersOpen()">
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
            <label class="flex items-center gap-2 text-sm text-muted sm:self-end sm:pb-2.5">
              <input
                type="checkbox"
                formControlName="advisorsOnly"
                class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-navy-900"
              />
              Solo asesores
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3">
              <p class="text-xs text-subtle">Total usuarios</p>
              <p class="text-xl font-semibold text-text sm:text-2xl">{{ total() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3">
              <p class="text-xs text-subtle">Activos</p>
              <p class="text-xl font-semibold text-success sm:text-2xl">{{ activeCount() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3">
              <p class="text-xs text-subtle">Inactivos</p>
              <p class="text-xl font-semibold text-muted sm:text-2xl">{{ inactiveCount() }}</p>
            </div>
          </div>
        </form>
      </div>

      <app-user-form
        [form]="userForm"
        [isOpen]="panelOpen()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        (formCancel)="cancelCreate()"
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly users = signal<UserBackend[]>([]);
  readonly availableRoles = signal<Role[]>([]);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  // QA 2026-09-15: mismo patrón mobile de clients.component.ts (F33 ronda
  // 2) — "Filtros y resumen" colapsado por defecto en mobile (sm:hidden en
  // el botón, formulario+métricas ocultos hasta expandir).
  readonly filtersOpen = signal(false);
  readonly showRolesModal = signal(false);
  readonly selectedUser = signal<UserBackend | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly total = signal(0);

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all'],
    advisorsOnly: [false],
  });

  /**
   * F35 rediseño 2026-09-15: este modal ya es solo de alta (invitación) —
   * la edición (incl. perfil profesional y roles y permisos de solo lectura)
   * vive en la ficha del usuario (`UserDetailComponent`, /usuarios/:id).
   */
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

    if (this.filterValues().advisorsOnly) {
      filtered = filtered.filter((u) => u.isAdvisor);
    }

    return filtered;
  });

  readonly activeCount = computed(() => this.users().filter((u) => u.isActive).length);
  readonly inactiveCount = computed(() => this.users().filter((u) => !u.isActive).length);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

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
    this.redirectFromQueryParam();
  }

  /** F18/F35 — al llegar desde un resultado de búsqueda global (?openId=),
   * navega directo a la ficha de ese usuario (mismo patrón que Clientes). */
  private redirectFromQueryParam(): void {
    const openId = this.route.snapshot.queryParamMap.get('openId');
    if (!openId) {
      return;
    }
    this.router.navigate(['/usuarios', openId]);
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
      this.cancelCreate();
    }
  }

  /** F35 rediseño: "Editar" ya no abre un panel inline — navega a la ficha. */
  editUser(user: UserBackend): void {
    this.router.navigate(['/usuarios', user.id]);
  }

  cancelCreate(): void {
    this.userForm.reset({ firstName: '', lastName: '', email: '' });
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
    const createData: CreateUserRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
    };

    this.usersService.createUser(createData).subscribe({
      next: (response) => {
        this.toastService.success(response.message || `Invitación enviada a ${formValue.email}`);
        this.cancelCreate();
        this.isSubmitting.set(false);
        // F35 rediseño 2026-09-15: "Modal mínimo → ficha" — tras crear, se
        // navega directo a la ficha del nuevo usuario para completar el
        // perfil profesional (asesor legal) y, luego, asignar roles.
        this.router.navigate(['/usuarios', response.user.id]);
      },
      error: (error) => {
        const message = error.message || 'Error al enviar la invitación';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isSubmitting.set(false);
      },
    });
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
        this.toastService.error(error.message || 'Error al cambiar estado del usuario');
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
        this.toastService.error(error.message || 'Error al desactivar la verificación en dos pasos');
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
        this.toastService.error(error.message || 'Error al reenviar la invitación');
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
        this.toastService.error(error.message || 'Error al asignar roles');
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
