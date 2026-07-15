import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ClientsService } from '../../core/services/clients.service';
import { ClientResponse, CreateClientRequest, UpdateClientRequest, RiskLevel, DocumentType } from '../../core/models/client-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../core/components/pagination.component';
import { EntityFilesComponent } from '../../core/components/entity-files.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, PaginationComponent, EntityFilesComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Gestión de clientes</h2>
          <p class="text-sm text-subtle">Administra la información de tus clientes.</p>
        </div>
        <button
          *hasPermission="'clients.create'"
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo cliente
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
                placeholder="Buscar por nombre, email o cédula/NIT"
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
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Nivel de riesgo</span>
              <select
                formControlName="riskLevel"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="all">Todos</option>
                <option value="LOW">Bajo</option>
                <option value="MEDIUM">Medio</option>
                <option value="HIGH">Alto</option>
              </select>
            </label>
          </div>
          
          <div class="grid gap-4 sm:grid-cols-4">
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Total clientes</p>
              <p class="text-2xl font-semibold text-text">{{ total() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Activos</p>
              <p class="text-2xl font-semibold text-success">{{ activeCount() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Riesgo alto</p>
              <p class="text-2xl font-semibold text-danger">{{ highRiskCount() }}</p>
            </div>
            <div class="rounded-md border border-default bg-surface-muted px-4 py-3">
              <p class="text-xs text-subtle">Riesgo bajo</p>
              <p class="text-2xl font-semibold text-success">{{ lowRiskCount() }}</p>
            </div>
          </div>
        </form>
      </div>

      <!-- Modal para crear/editar cliente -->
      @if (panelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            class="w-full max-w-xl md:max-w-4xl lg:max-w-5xl overflow-y-auto rounded-lg border border-default bg-surface shadow-2xl"
            style="max-height: 90vh"
          >
            <!-- Layout de 2 columnas: Formulario + Archivos -->
            <div class="grid gap-6 {{ editingClient() ? 'md:grid-cols-[1fr_320px]' : 'md:grid-cols-1' }}">
              <!-- Columna izquierda: Formulario -->
              <form
                class="p-4 md:p-6"
                [formGroup]="clientForm"
                (ngSubmit)="submitClient()"
              >
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-text">
                    {{ editingClient() ? 'Editar cliente' : 'Nuevo cliente' }}
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
                      Nombre completo *
                      <input
                        formControlName="fullName"
                        type="text"
                        placeholder="Ej: María González Rodríguez"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                      @if (clientForm.get('fullName')?.touched && clientForm.get('fullName')?.invalid) {
                        <p class="mt-1 text-xs text-danger">Campo requerido</p>
                      }
                    </label>
                    <label class="text-sm text-muted">
                      Empresa
                      <input
                        formControlName="companyName"
                        type="text"
                        placeholder="Ej: Corporación Legal S.A.S."
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                    </label>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Email *
                      <input
                        formControlName="email"
                        type="email"
                        placeholder="contacto@empresa.com.co"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                      @if (clientForm.get('email')?.touched && clientForm.get('email')?.invalid) {
                        <p class="mt-1 text-xs text-danger">Email inválido</p>
                      }
                    </label>
                    <label class="text-sm text-muted">
                      Teléfono
                      <input
                        formControlName="phone"
                        type="tel"
                        placeholder="+57 300 123 4567"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                    </label>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Tipo de documento *
                      <select
                        formControlName="documentType"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="NIT">NIT</option>
                      </select>
                    </label>
                    <label class="text-sm text-muted">
                      Número de identificación *
                      <input
                        formControlName="identificationNumber"
                        type="text"
                        placeholder="Cédula, NIT, Pasaporte"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                      @if (clientForm.get('identificationNumber')?.touched && clientForm.get('identificationNumber')?.invalid) {
                        <p class="mt-1 text-xs text-danger">Campo requerido</p>
                      }
                      @if (clientForm.errors?.['invalidNit']) {
                        <p class="mt-1 text-xs text-danger">{{ clientForm.errors?.['invalidNit'] }}</p>
                      }
                      @if (clientForm.errors?.['invalidCedula']) {
                        <p class="mt-1 text-xs text-danger">{{ clientForm.errors?.['invalidCedula'] }}</p>
                      }
                    </label>
                    <label class="text-sm text-muted">
                      Nivel de riesgo
                      <select
                        formControlName="riskLevel"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      >
                        <option value="LOW">Bajo</option>
                        <option value="MEDIUM">Medio</option>
                        <option value="HIGH">Alto</option>
                      </select>
                    </label>
                  </div>

                  <label class="text-sm text-muted">
                    Dirección
                    <textarea
                      formControlName="address"
                      rows="3"
                      placeholder="Ej: Calle 100 # 19-30, Bogotá D.C."
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    ></textarea>
                  </label>
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
                    [disabled]="isSubmitting() || clientForm.invalid"
                  >
                    {{ editingClient() ? 'Actualizar' : 'Crear cliente' }}
                  </button>
                </div>
              </form>

              <!-- Columna derecha: Archivos (solo en edición) -->
              @if (editingClient()) {
                <div class="border-l border-default bg-surface-muted p-4 md:p-6 overflow-y-auto" style="max-height: 90vh">
                  <h4 class="mb-4 text-sm font-semibold text-text">Archivos del cliente</h4>
                  <app-entity-files
                    entityType="client"
                    [entityId]="editingClient()!.id"
                  />
                </div>
              }
            </div>
          </div>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (filteredClients().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No se encontraron clientes</p>
        </div>
      } @else {
        <!-- Tabla para desktop -->
        <div class="hidden md:block rounded-lg border border-default bg-surface shadow-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th class="px-6 py-4">Cliente</th>
                <th class="px-6 py-4">Empresa</th>
                <th class="px-6 py-4">Contacto</th>
                <th class="px-6 py-4">Riesgo</th>
                <th class="px-6 py-4">Estado</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              @for (client of filteredClients(); track client.id) {
                <tr class="transition hover:bg-surface-muted">
                  <td class="px-6 py-4">
                    <div>
                      <p class="font-semibold text-text">{{ client.fullName }}</p>
                      <p class="text-sm text-subtle">
                        {{ getDocumentTypeLabel(client.documentType) }}: {{ client.identificationNumber }}
                      </p>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted">
                    {{ client.companyName || 'N/A' }}
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm text-text">{{ client.email }}</p>
                    <p class="text-sm text-subtle">{{ client.phone || 'N/A' }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                      [class]="{
                        'bg-success-tint text-success': client.riskLevel === 'LOW',
                        'bg-warning-tint text-warning': client.riskLevel === 'MEDIUM',
                        'bg-danger-tint text-danger': client.riskLevel === 'HIGH'
                      }"
                    >
                      {{ getRiskLevelLabel(client.riskLevel) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                      [class]="client.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
                    >
                      {{ client.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2">
                      <button
                        *hasPermission="'clients.edit'"
                        type="button"
                        (click)="editClient(client)"
                        class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                        title="Editar"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                        </svg>
                      </button>
                      <button
                        *hasPermission="['clients.activate', 'clients.deactivate']"
                        type="button"
                        (click)="toggleClientStatus(client)"
                        class="rounded-lg p-2 transition"
                        [class]="client.isActive ? 'text-warning hover:bg-warning-tint hover:text-warning' : 'text-success hover:bg-success-tint hover:text-success'"
                        [title]="client.isActive ? 'Desactivar cliente' : 'Activar cliente'"
                      >
                        @if (client.isActive) {
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        } @else {
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        }
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
          @for (client of filteredClients(); track client.id) {
            <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
              <div class="mb-3 flex items-start justify-between">
                <div>
                  <p class="font-semibold text-text">{{ client.fullName }}</p>
                  <p class="text-sm text-subtle">
                    {{ getDocumentTypeLabel(client.documentType) }}: {{ client.identificationNumber }}
                  </p>
                </div>
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                  [class]="client.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
                >
                  {{ client.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              
              <div class="mb-3 space-y-2 text-sm">
                <div>
                  <span class="text-xs font-medium text-subtle">Empresa:</span>
                  <span class="ml-2 text-xs text-muted">{{ client.companyName || 'N/A' }}</span>
                </div>
                <div>
                  <span class="text-xs font-medium text-subtle">Email:</span>
                  <span class="ml-2 text-xs text-muted">{{ client.email }}</span>
                </div>
                <div>
                  <span class="text-xs font-medium text-subtle">Teléfono:</span>
                  <span class="ml-2 text-xs text-muted">{{ client.phone || 'N/A' }}</span>
                </div>
                <div>
                  <span class="text-xs font-medium text-subtle">Riesgo:</span>
                  <span
                    class="ml-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                    [class]="{
                      'bg-success-tint text-success': client.riskLevel === 'LOW',
                      'bg-warning-tint text-warning': client.riskLevel === 'MEDIUM',
                      'bg-danger-tint text-danger': client.riskLevel === 'HIGH'
                    }"
                  >
                    {{ getRiskLevelLabel(client.riskLevel) }}
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  *hasPermission="'clients.edit'"
                  type="button"
                  (click)="editClient(client)"
                  class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
                >
                  Editar
                </button>
                <button
                  *hasPermission="['clients.activate', 'clients.deactivate']"
                  type="button"
                  (click)="toggleClientStatus(client)"
                  class="flex-1 rounded-md border px-3 py-2 text-xs font-medium transition"
                  [class]="client.isActive ? 'border-warning text-warning hover:bg-warning-tint' : 'border-success text-success hover:bg-success-tint'"
                >
                  {{ client.isActive ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Paginación -->
      @if (!isLoading() && filteredClients().length > 0) {
        <app-pagination
          [total]="total()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize"
          [currentItems]="filteredClients().length"
          [totalPages]="totalPages()"
          itemLabel="clientes"
          (nextPage)="nextPage()"
          (previousPage)="previousPage()"
        />
      }
    </div>
  `,
})
export class ClientsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);

  readonly clients = signal<ClientResponse[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingClient = signal<ClientResponse | null>(null);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all'],
    riskLevel: ['all'],
  });

  readonly clientForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    companyName: [''],
    phone: [''],
    email: ['', [Validators.required, Validators.email]],
    address: [''],
    documentType: ['CC' as DocumentType, [Validators.required]],
    identificationNumber: ['', [Validators.required]],
    riskLevel: ['LOW' as RiskLevel],
  }, {
    validators: [this.identificationNumberValidator.bind(this)]
  });

  readonly filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    { initialValue: this.filterForm.value }
  );

  /**
   * Validador personalizado para número de identificación según tipo de documento
   */
  private identificationNumberValidator(control: AbstractControl): ValidationErrors | null {
    const documentType = control.get('documentType')?.value;
    const identificationNumber = control.get('identificationNumber')?.value;

    if (!documentType || !identificationNumber) {
      return null;
    }

    // Validación para NIT: debe empezar con 8 o 9 y tener entre 9 y 10 dígitos
    if (documentType === 'NIT') {
      const nitPattern = /^[89]\d{8,9}$/;
      if (!nitPattern.test(identificationNumber)) {
        return { invalidNit: 'El NIT debe empezar con 8 o 9 y tener entre 9 y 10 dígitos' };
      }
    }

    // Validación para Cédula: solo números, entre 6 y 10 dígitos
    if (documentType === 'CC') {
      const cedulaPattern = /^\d{6,10}$/;
      if (!cedulaPattern.test(identificationNumber)) {
        return { invalidCedula: 'La cédula debe tener entre 6 y 10 dígitos' };
      }
    }

    return null;
  }

  readonly filteredClients = computed(() => {
    const search = this.filterValues().search?.toLowerCase() || '';
    const status = this.filterValues().status || 'all';
    const riskLevel = this.filterValues().riskLevel || 'all';
    const allClients = this.clients();
    
    if (!Array.isArray(allClients)) {
      return [];
    }
    
    let filtered = allClients;

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.identificationNumber.toLowerCase().includes(search) ||
          c.companyName?.toLowerCase().includes(search)
      );
    }

    if (status === 'active') {
      filtered = filtered.filter((c) => c.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter((c) => !c.isActive);
    }

    if (riskLevel !== 'all') {
      filtered = filtered.filter((c) => c.riskLevel === riskLevel);
    }

    return filtered;
  });

  readonly activeCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients) ? clients.filter((c) => c.isActive).length : 0;
  });
  
  readonly highRiskCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients) ? clients.filter((c) => c.riskLevel === 'HIGH').length : 0;
  });
  
  readonly lowRiskCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients) ? clients.filter((c) => c.riskLevel === 'LOW').length : 0;
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientsService.getClients(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.clients.set(Array.isArray(response.clients) ? response.clients : []);
        this.total.set(response.total || 0);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
        this.clients.set([]);
        this.total.set(0);
        this.isLoading.set(false);
      },
    });
  }

  togglePanel(): void {
    this.panelOpen.update((open) => !open);
    if (!this.panelOpen()) {
      this.cancelEdit();
    }
  }

  editClient(client: ClientResponse): void {
    this.editingClient.set(client);
    this.clientForm.patchValue({
      fullName: client.fullName,
      companyName: client.companyName || '',
      phone: client.phone || '',
      email: client.email,
      address: client.address || '',
      documentType: client.documentType,
      identificationNumber: client.identificationNumber,
      riskLevel: client.riskLevel,
    });
    this.panelOpen.set(true);
  }

  cancelEdit(): void {
    this.editingClient.set(null);
    this.clientForm.reset({
      fullName: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
      documentType: 'CC',
      identificationNumber: '',
      riskLevel: 'LOW',
    });
    this.errorMessage.set(null);
    this.panelOpen.set(false);
  }

  submitClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.clientForm.getRawValue();

    if (this.editingClient()) {
      const updateData: UpdateClientRequest = {
        fullName: formValue.fullName,
        companyName: formValue.companyName || undefined,
        phone: formValue.phone || undefined,
        email: formValue.email,
        address: formValue.address || undefined,
        documentType: formValue.documentType,
        identificationNumber: formValue.identificationNumber,
        riskLevel: formValue.riskLevel,
      };

      this.clientsService.updateClient(this.editingClient()!.id, updateData).subscribe({
        next: () => {
          this.loadClients();
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al actualizar cliente');
          this.isSubmitting.set(false);
        },
      });
    } else {
      const createData: CreateClientRequest = {
        fullName: formValue.fullName,
        companyName: formValue.companyName || undefined,
        phone: formValue.phone || undefined,
        email: formValue.email,
        address: formValue.address || undefined,
        documentType: formValue.documentType,
        identificationNumber: formValue.identificationNumber,
        riskLevel: formValue.riskLevel,
      };

      this.clientsService.createClient(createData).subscribe({
        next: () => {
          this.loadClients();
          this.cancelEdit();
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.message || 'Error al crear cliente');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  toggleClientStatus(client: ClientResponse): void {
    if (!confirm(`¿Estás seguro de ${client.isActive ? 'desactivar' : 'activar'} a ${client.fullName}?`)) {
      return;
    }

    this.clientsService.toggleActive(client.id).subscribe({
      next: () => {
        this.loadClients();
      },
      error: (error) => {
        alert(error.message || 'Error al cambiar estado del cliente');
      },
    });
  }

  getRiskLevelLabel(riskLevel: RiskLevel): string {
    const labels: Record<RiskLevel, string> = {
      LOW: 'Bajo',
      MEDIUM: 'Medio',
      HIGH: 'Alto',
    };
    return labels[riskLevel] || riskLevel;
  }

  getDocumentTypeLabel(documentType: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      CC: 'Cédula',
      NIT: 'NIT',
    };
    return labels[documentType] || documentType;
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadClients();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadClients();
    }
  }
}
