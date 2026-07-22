import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, catchError, of } from 'rxjs';
import { AdvisorsService } from '../../core/services/advisors.service';
import { UsersService } from '../../core/services/users.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { AdvisorResponse, AdvisorStatus } from '../../core/models/advisor-backend.model';
import { UserBackend } from '../../core/models/user-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../core/components/pagination.component';
import { AdvisorFormComponent } from './components/advisor-form.component';
import { AdvisorsTableComponent } from './components/advisors-table.component';
import { getAdvisorFullName } from './utils/advisor-format.utils';

type FilterStatus = AdvisorStatus | 'ALL';

@Component({
  selector: 'app-advisors',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective, PaginationComponent, AdvisorFormComponent, AdvisorsTableComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Asesores legales</h2>
          <p class="text-sm text-subtle">Gestiona perfiles, disponibilidad y métricas de desempeño.</p>
        </div>
        <button
          *hasPermission="'advisors.create'"
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo asesor
        </button>
      </header>

      <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <form [formGroup]="filterForm" class="space-y-4">
          <div class="flex flex-col gap-4 sm:flex-row">
            <label class="flex-1 text-sm text-muted">
              <span class="mb-2 block">Búsqueda</span>
              <input
                type="search"
                formControlName="search"
                placeholder="Nombre, especialidad o correo"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Estado</span>
              <select
                formControlName="status"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="ALL">Todos</option>
                <option [value]="AdvisorStatus.AVAILABLE">Disponible</option>
                <option [value]="AdvisorStatus.IN_HEARING">En audiencia</option>
                <option [value]="AdvisorStatus.IN_MEETING">En reunión</option>
                <option [value]="AdvisorStatus.BUSY">Ocupado</option>
              </select>
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-4">
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Total asesores</p>
              <p class="text-2xl font-semibold text-text">{{ total() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Disponibles</p>
              <p class="text-2xl font-semibold text-success">{{ availableAdvisors() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">En audiencia</p>
              <p class="text-2xl font-semibold text-warning">{{ inHearingCount() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Ocupados</p>
              <p class="text-2xl font-semibold text-muted">{{ busyCount() }}</p>
            </div>
          </div>
        </form>
      </div>

      <app-advisor-form
        [form]="advisorForm"
        [isOpen]="panelOpen()"
        [isEditing]="!!editingAdvisor()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        [availableUsers]="availableUsers()"
        [specialties]="specialties()"
        (cancel)="cancelEdit()"
        (submit)="submitAdvisor()"
      />

      <app-advisors-table
        [advisors]="filteredAdvisors()"
        [isLoading]="isLoading()"
        [emptyMessage]="emptyStateMessage()"
        (edit)="editAdvisor($event)"
        (toggleStatus)="toggleAdvisorStatus($event)"
      />

      @if (!isLoading() && filteredAdvisors().length > 0) {
        <app-pagination
          [total]="total()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize"
          [currentItems]="filteredAdvisors().length"
          [totalPages]="totalPages()"
          itemLabel="asesores"
          (nextPage)="nextPage()"
          (previousPage)="previousPage()"
        />
      }
    </div>
  `,
})
export class AdvisorsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly usersService = inject(UsersService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly AdvisorStatus = AdvisorStatus;

  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly users = signal<UserBackend[]>([]);
  readonly specialties = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingAdvisor = signal<AdvisorResponse | null>(null);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['ALL' as FilterStatus],
  });

  readonly advisorForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    phone: [''],
    specialtyId: ['', [Validators.required]],
    status: [AdvisorStatus.AVAILABLE, Validators.required],
    experienceYears: [0, [Validators.required, Validators.min(0)]],
    rating: [0, [Validators.min(0), Validators.max(5)]],
  });

  private readonly filterValue = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly filteredAdvisors = computed(() => {
    const filter = this.filterValue();
    const search = (filter.search ?? '').toLowerCase();
    const status = filter.status ?? 'ALL';

    return this.advisors().filter((advisor) => {
      const matchesTerm =
        search === '' ||
        getAdvisorFullName(advisor).toLowerCase().includes(search) ||
        advisor.user?.email.toLowerCase().includes(search) ||
        (advisor.specialty?.label ?? '').toLowerCase().includes(search);
      const matchesStatus = status === 'ALL' || advisor.status === status;
      return matchesTerm && matchesStatus;
    });
  });

  readonly emptyStateMessage = computed(() => {
    const filter = this.filterValue();
    const hasActiveFilters = !!filter.search || filter.status !== 'ALL';
    return hasActiveFilters
      ? 'No se encontraron resultados'
      : 'Comienza agregando tu primer asesor legal al equipo';
  });

  readonly availableAdvisors = computed(() =>
    this.advisors().filter((a) => a.status === AdvisorStatus.AVAILABLE && a.isActive).length
  );

  readonly inHearingCount = computed(() =>
    this.advisors().filter((a) => a.status === AdvisorStatus.IN_HEARING).length
  );

  readonly busyCount = computed(() =>
    this.advisors().filter((a) => a.status === AdvisorStatus.BUSY).length
  );

  readonly availableUsers = computed(() => {
    const currentAdvisor = this.editingAdvisor();
    const advisorUserIds = new Set(
      this.advisors()
        .filter((a) => a.id !== currentAdvisor?.id)
        .map((a) => a.userId)
    );
    return this.users().filter((user) => !advisorUserIds.has(user.id) && user.isActive);
  });

  constructor() {
    effect(() => {
      this.loadAdvisors();
      this.loadUsers();
    }, { allowSignalWrites: true });
    this.loadSpecialties();
  }

  private loadSpecialties(): void {
    this.catalogsService.getActiveCatalog('advisor_specialty').subscribe((items) => this.specialties.set(items));
  }

  private loadAdvisors(): void {
    this.isLoading.set(true);

    this.advisorsService
      .getAdvisors(this.currentPage(), this.pageSize)
      .pipe(
        catchError((error) => {
          this.errorMessage.set(error.error?.message || 'Error al cargar asesores');
          return of({ advisors: [], total: 0, page: 1, limit: this.pageSize, message: '' });
        })
      )
      .subscribe((response) => {
        this.advisors.set(response.advisors);
        this.total.set(response.total);
        this.isLoading.set(false);
      });
  }

  private loadUsers(): void {
    this.usersService
      .getUsers(1, 100)
      .pipe(
        catchError(() => of({ users: [], total: 0, page: 1, limit: 100 }))
      )
      .subscribe((response) => {
        this.users.set(response.users || []);
      });
  }

  togglePanel(): void {
    this.panelOpen.update((value) => !value);
    if (!this.panelOpen()) {
      this.editingAdvisor.set(null);
      this.advisorForm.reset({
        userId: '',
        phone: '',
        specialtyId: '',
        status: AdvisorStatus.AVAILABLE,
        experienceYears: 0,
        rating: 0,
      });
      this.advisorForm.enable();
      this.errorMessage.set(null);
    }
  }

  cancelEdit(): void {
    this.togglePanel();
  }

  editAdvisor(advisor: AdvisorResponse): void {
    this.editingAdvisor.set(advisor);

    const formData = {
      userId: advisor.userId,
      phone: advisor.phone || '',
      specialtyId: advisor.specialty?.id || '',
      status: advisor.status,
      experienceYears: advisor.experienceYears,
      rating: advisor.rating || 0,
    };

    this.advisorForm.patchValue(formData);

    this.advisorForm.controls.userId.disable();
    this.panelOpen.set(true);
  }

  submitAdvisor(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.advisorForm.invalid) {
      this.advisorForm.markAllAsTouched();
      this.errorMessage.set('Por favor completa los campos obligatorios.');
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const formValue = this.advisorForm.getRawValue();
    const currentAdvisor = this.editingAdvisor();

    if (currentAdvisor) {
      const updatePayload = {
        specialtyId: formValue.specialtyId,
        phone: formValue.phone || undefined,
        status: formValue.status,
        experienceYears: formValue.experienceYears,
        rating: formValue.rating || undefined,
      };

      this.advisorsService.updateAdvisor(currentAdvisor.id, updatePayload).subscribe({
        next: (updatedAdvisor) => {
          this.advisors.update((advisors) =>
            advisors.map((a) => (a.id === currentAdvisor.id ? updatedAdvisor : a))
          );
          this.isSubmitting.set(false);
          this.togglePanel();
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Error al actualizar asesor');
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createPayload = {
        userId: formValue.userId,
        specialtyId: formValue.specialtyId,
        phone: formValue.phone || undefined,
        status: formValue.status,
        experienceYears: formValue.experienceYears,
        rating: formValue.rating || undefined,
      };

      this.advisorsService.createAdvisor(createPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.togglePanel();
          this.loadAdvisors();
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Error al crear asesor');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadAdvisors();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadAdvisors();
    }
  }

  async toggleAdvisorStatus(advisor: AdvisorResponse): Promise<void> {
    const newStatus = !advisor.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    const confirmed = await this.confirmDialog.confirm({
      title: newStatus ? 'Activar asesor' : 'Desactivar asesor',
      message: `¿Estás seguro de ${action} a ${getAdvisorFullName(advisor)}?`,
      danger: !newStatus,
    });
    if (!confirmed) {
      return;
    }

    this.advisorsService.toggleActive(advisor.id).subscribe({
      next: (updatedAdvisor) => {
        this.advisors.update((advisors) =>
          advisors.map((a) => (a.id === advisor.id ? updatedAdvisor : a))
        );
      },
      error: (error) => {
        alert(error.message || `Error al ${action} asesor`);
      },
    });
  }
}
