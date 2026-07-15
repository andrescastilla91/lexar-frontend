import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, catchError, of } from 'rxjs';
import { AdvisorsService } from '../../core/services/advisors.service';
import { UsersService } from '../../core/services/users.service';
import { AdvisorResponse, AdvisorStatus } from '../../core/models/advisor-backend.model';
import { UserBackend } from '../../core/models/user-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../core/components/pagination.component';

type FilterStatus = AdvisorStatus | 'ALL';

const STATUS_LABELS: Record<AdvisorStatus, string> = {
  [AdvisorStatus.AVAILABLE]: 'Disponible',
  [AdvisorStatus.IN_HEARING]: 'En audiencia',
  [AdvisorStatus.IN_MEETING]: 'En reunión',
  [AdvisorStatus.BUSY]: 'Ocupado',
};

@Component({
  selector: 'app-advisors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, PaginationComponent],
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

      <!-- Filtros compactos -->
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

      <!-- Modal para crear/editar asesor -->
      @if (panelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            class="w-full max-w-xl md:max-w-2xl overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
            style="max-height: 90vh"
            [formGroup]="advisorForm"
            (ngSubmit)="submitAdvisor()"
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-text">
                {{ editingAdvisor() ? 'Editar asesor' : 'Registrar nuevo asesor' }}
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
              <label class="text-sm text-muted">
                Usuario *
                <select
                  formControlName="userId"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                >
                  <option value="">Selecciona un usuario</option>
                  @for (user of availableUsers(); track user.id) {
                    <option [value]="user.id">{{ user.firstName }} {{ user.lastName }} ({{ user.email }})</option>
                  }
                </select>
                @if (advisorForm.get('userId')?.touched && advisorForm.get('userId')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Campo requerido</p>
                }
              </label>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="text-sm text-muted">
                  Teléfono
                  <input
                    formControlName="phone"
                    type="text"
                    placeholder="+57 300 000 0000"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="text-sm text-muted">
                  Especialidad *
                  <input
                    formControlName="specialty"
                    type="text"
                    placeholder="Derecho administrativo, penal, etc."
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                  @if (advisorForm.get('specialty')?.touched && advisorForm.get('specialty')?.invalid) {
                    <p class="mt-1 text-xs text-danger">Campo requerido</p>
                  }
                </label>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <label class="text-sm text-muted">
                  Estado
                  <select
                    formControlName="status"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option [value]="AdvisorStatus.AVAILABLE">Disponible</option>
                    <option [value]="AdvisorStatus.IN_HEARING">En audiencia</option>
                    <option [value]="AdvisorStatus.IN_MEETING">En reunión</option>
                    <option [value]="AdvisorStatus.BUSY">Ocupado</option>
                  </select>
                </label>
                <label class="text-sm text-muted">
                  Años de experiencia
                  <input
                    formControlName="experienceYears"
                    type="number"
                    min="0"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="text-sm text-muted">
                  Calificación
                  <input
                    formControlName="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
              </div>
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
                [disabled]="isSubmitting() || advisorForm.invalid"
              >
                {{ editingAdvisor() ? 'Actualizar' : 'Crear asesor' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (filteredAdvisors().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <svg class="mx-auto h-16 w-16 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="mt-4 text-lg font-semibold text-text">No hay asesores registrados</h3>
          <p class="mt-2 text-sm text-subtle">
            {{ filterForm.value.search || filterForm.value.status !== 'ALL' ? 'No se encontraron resultados' : 'Comienza agregando tu primer asesor legal al equipo' }}
          </p>
        </div>
      } @else {
        <!-- Tabla para desktop -->
        <div class="hidden md:block rounded-lg border border-default bg-surface shadow-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th class="px-6 py-4">Asesor</th>
                <th class="px-6 py-4">Contacto</th>
                <th class="px-6 py-4">Especialidad</th>
                <th class="px-6 py-4">Experiencia</th>
                <th class="px-6 py-4">Estado</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              @for (advisor of filteredAdvisors(); track advisor.id) {
                <tr class="transition hover:bg-surface-muted">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                        {{ initials(advisor) }}
                      </div>
                      <div>
                        <p class="font-semibold text-text">{{ getFullName(advisor) }}</p>
                        <p class="text-sm text-subtle">{{ advisor.user?.email || 'Sin email' }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted">
                    {{ advisor.phone || 'N/A' }}
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm font-medium text-text">{{ advisor.specialty }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3 text-sm">
                      <span class="text-muted">{{ advisor.experienceYears }} años</span>
                      @if (advisor.rating && advisor.rating > 0) {
                        <span class="flex items-center gap-1 text-warning">
                          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                          </svg>
                          {{ advisor.rating.toFixed(1) }}
                        </span>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                      [class]="statusClasses(advisor.status)"
                    >
                      <span class="h-2 w-2 rounded-full" [class]="dotClasses(advisor.status)"></span>
                      {{ getStatusLabel(advisor.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2">
                      <button
                        *hasPermission="'advisors.edit'"
                        type="button"
                        (click)="editAdvisor(advisor)"
                        class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                        title="Editar"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                        </svg>
                      </button>
                      <button
                        *hasPermission="['advisors.activate', 'advisors.deactivate']"
                        type="button"
                        (click)="toggleAdvisorStatus(advisor)"
                        class="rounded-lg p-2 transition"
                        [class]="advisor.isActive ? 'text-warning hover:bg-warning-tint' : 'text-success hover:bg-success-tint'"
                        [title]="advisor.isActive ? 'Desactivar' : 'Activar'"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          @if (advisor.isActive) {
                            <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          } @else {
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          }
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
          @for (advisor of filteredAdvisors(); track advisor.id) {
            <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
              <div class="mb-3 flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {{ initials(advisor) }}
                  </div>
                  <div>
                    <p class="font-semibold text-text">{{ getFullName(advisor) }}</p>
                    <p class="text-sm text-subtle">{{ advisor.user?.email || 'Sin email' }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold"
                  [class]="statusClasses(advisor.status)"
                >
                  <span class="h-2 w-2 rounded-full" [class]="dotClasses(advisor.status)"></span>
                  {{ getStatusLabel(advisor.status) }}
                </span>
              </div>

              <div class="mb-3 space-y-2 text-sm">
                <div>
                  <span class="text-xs font-medium text-subtle">Teléfono:</span>
                  <span class="ml-2 text-xs text-muted">{{ advisor.phone || 'N/A' }}</span>
                </div>
                <div>
                  <span class="text-xs font-medium text-subtle">Especialidad:</span>
                  <span class="ml-2 text-xs text-muted">{{ advisor.specialty }}</span>
                </div>
                <div>
                  <span class="text-xs font-medium text-subtle">Experiencia:</span>
                  <span class="ml-2 text-xs text-muted">{{ advisor.experienceYears }} años</span>
                  @if (advisor.rating && advisor.rating > 0) {
                    <span class="ml-2 inline-flex items-center gap-1 text-warning">
                      <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                      </svg>
                      {{ advisor.rating.toFixed(1) }}
                    </span>
                  }
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  *hasPermission="'advisors.edit'"
                  type="button"
                  (click)="editAdvisor(advisor)"
                  class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
                >
                  Editar
                </button>                <button
                  *hasPermission="['advisors.activate', 'advisors.deactivate']"
                  type="button"
                  (click)="toggleAdvisorStatus(advisor)"
                  class="flex-1 rounded-md border px-4 py-2 text-xs font-semibold transition"
                  [class]="advisor.isActive ? 'border-warning text-warning hover:bg-warning-tint' : 'border-success text-success hover:bg-success-tint'"
                >
                  {{ advisor.isActive ? 'Desactivar' : 'Activar' }}
                </button>              </div>
            </div>
          }
        </div>
      }

      <!-- Paginación -->
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

  protected readonly AdvisorStatus = AdvisorStatus;

  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly users = signal<UserBackend[]>([]);
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
    specialty: ['', [Validators.required]],
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
        this.getFullName(advisor).toLowerCase().includes(search) ||
        advisor.user?.email.toLowerCase().includes(search) ||
        advisor.specialty.toLowerCase().includes(search);
      const matchesStatus = status === 'ALL' || advisor.status === status;
      return matchesTerm && matchesStatus;
    });
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
        .filter((a) => a.id !== currentAdvisor?.id) // Excluir el asesor en edición
        .map((a) => a.userId)
    );
    return this.users().filter((user) => !advisorUserIds.has(user.id) && user.isActive);
  });

  constructor() {
    effect(() => {
      this.loadAdvisors();
      this.loadUsers();
    }, { allowSignalWrites: true });
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
        specialty: '',
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
      specialty: advisor.specialty,
      status: advisor.status,
      experienceYears: advisor.experienceYears,
      rating: advisor.rating || 0,
    };
    
    this.advisorForm.patchValue(formData);
    
    this.advisorForm.controls.userId.disable();
    this.panelOpen.set(true);
  }

  submitAdvisor(): void {
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
      // Actualizar - NO enviar userId
      const updatePayload = {
        specialty: formValue.specialty,
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
      // Crear - SÍ enviar userId
      const createPayload = {
        userId: formValue.userId,
        specialty: formValue.specialty,
        phone: formValue.phone || undefined,
        status: formValue.status,
        experienceYears: formValue.experienceYears,
        rating: formValue.rating || undefined,
      };

      this.advisorsService.createAdvisor(createPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.togglePanel();
          this.loadAdvisors(); // Recargar para obtener el total actualizado
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

  getFullName(advisor: AdvisorResponse): string {
    if (advisor.user) {
      return `${advisor.user.firstName} ${advisor.user.lastName}`;
    }
    return 'Sin nombre';
  }

  initials(advisor: AdvisorResponse): string {
    if (advisor.user) {
      return `${advisor.user.firstName.charAt(0)}${advisor.user.lastName.charAt(0)}`.toUpperCase();
    }
    return '??';
  }

  getStatusLabel(status: AdvisorStatus): string {
    return STATUS_LABELS[status] || status;
  }

  statusClasses(status: AdvisorStatus): string {
    switch (status) {
      case AdvisorStatus.AVAILABLE:
        return 'bg-success-tint text-success';
      case AdvisorStatus.IN_HEARING:
        return 'bg-warning-tint text-warning';
      case AdvisorStatus.IN_MEETING:
        return 'bg-info-tint text-info';
      case AdvisorStatus.BUSY:
        return 'bg-surface-muted text-muted';
      default:
        return 'bg-surface-muted text-muted';
    }
  }

  dotClasses(status: AdvisorStatus): string {
    switch (status) {
      case AdvisorStatus.AVAILABLE:
        return 'bg-success';
      case AdvisorStatus.IN_HEARING:
        return 'bg-warning';
      case AdvisorStatus.IN_MEETING:
        return 'bg-primary';
      case AdvisorStatus.BUSY:
        return 'bg-strong';
      default:
        return 'bg-strong';
    }
  }

  toggleAdvisorStatus(advisor: AdvisorResponse): void {
    const newStatus = !advisor.isActive;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${action} a ${this.getFullName(advisor)}?`)) {
      return;
    }

    this.advisorsService.updateAdvisor(advisor.id, { isActive: newStatus }).subscribe({
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
