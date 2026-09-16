import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ClientsService } from '../../core/services/clients.service';
import {
  ClientResponse,
  ClientPersonType,
  CreateClientRequest,
} from '../../core/models/client-backend.model';
import { CatalogsService } from '../../core/services/catalogs.service';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import { AdvisorsService } from '../../core/services/advisors.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../core/components/pagination.component';
import { ClientFormComponent } from './components/client-form.component';
import { ClientsTableComponent } from './components/clients-table.component';
import { identificationNumberValidator } from './utils/identification-number.validator';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HasPermissionDirective,
    PaginationComponent,
    ClientFormComponent,
    ClientsTableComponent,
  ],
  template: `
    <div class="space-y-6">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-2xl font-semibold text-text">Gestión de clientes</h2>
          <p class="text-sm text-subtle">
            Administra la información de tus clientes.
          </p>
        </div>
        <button
          *hasPermission="'clients.create'"
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Nuevo cliente
        </button>
      </header>

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
                placeholder="Buscar por nombre o documento"
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
              <span class="mb-2 block">Tipo de persona</span>
              <select
                formControlName="personType"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="all">Todos</option>
                <option value="NATURAL">Natural</option>
                <option value="JURIDICA">Jurídica</option>
              </select>
            </label>
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Nivel de criticidad</span>
              <select
                formControlName="riskLevel"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="all">Todos</option>
                @for (riskLevel of riskLevels(); track riskLevel.id) {
                  <option [value]="riskLevel.code">
                    {{ riskLevel.label }}
                  </option>
                }
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div
              class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3"
            >
              <p class="text-xs text-subtle">Total clientes</p>
              <p class="text-xl font-semibold text-text sm:text-2xl">{{ total() }}</p>
            </div>
            <div
              class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3"
            >
              <p class="text-xs text-subtle">Activos</p>
              <p class="text-xl font-semibold text-success sm:text-2xl">
                {{ activeCount() }}
              </p>
            </div>
            <div
              class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3"
            >
              <p class="text-xs text-subtle">Criticidad alta</p>
              <p class="text-xl font-semibold text-danger sm:text-2xl">
                {{ highRiskCount() }}
              </p>
            </div>
            <div
              class="rounded-md border border-default bg-surface-muted px-3 py-2 sm:px-4 sm:py-3"
            >
              <p class="text-xs text-subtle">Criticidad baja</p>
              <p class="text-xl font-semibold text-success sm:text-2xl">
                {{ lowRiskCount() }}
              </p>
            </div>
          </div>
        </form>
      </div>

      <app-client-form
        [form]="clientForm"
        [isOpen]="panelOpen()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        [documentTypes]="documentTypes()"
        [riskLevels]="riskLevels()"
        [advisors]="advisors()"
        (cancel)="cancelCreate()"
        (submit)="submitClient()"
        (advisorIdsChange)="onAdvisorIdsChange($event)"
      />

      <app-clients-table
        [clients]="filteredClients()"
        [isLoading]="isLoading()"
        (toggleStatus)="toggleClientStatus($event)"
      />

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
  private readonly catalogsService = inject(CatalogsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly clients = signal<ClientResponse[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);
  /** Solo aplica en mobile (`sm:` fuerza visible en pantallas más grandes) —
   * en mobile prioriza el listado de clientes sobre filtros/métricas. */
  readonly filtersOpen = signal(false);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly documentTypes = signal<CatalogItem[]>([]);
  readonly riskLevels = signal<CatalogItem[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all'],
    personType: ['all'],
    riskLevel: ['all'],
  });

  readonly clientForm = this.fb.nonNullable.group(
    {
      personType: [ClientPersonType.NATURAL],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      address: [''],
      documentTypeId: ['', [Validators.required]],
      identificationNumber: ['', [Validators.required]],
      riskLevelId: [''],
      advisorIds: [[] as string[]],
    },
    {
      validators: [identificationNumberValidator(() => this.documentTypes())],
    },
  );

  readonly filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    { initialValue: this.filterForm.value },
  );

  readonly filteredClients = computed(() => {
    const search = this.filterValues().search?.toLowerCase() || '';
    const status = this.filterValues().status || 'all';
    const personType = this.filterValues().personType || 'all';
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
          c.identificationNumber.toLowerCase().includes(search),
      );
    }

    if (status === 'active') {
      filtered = filtered.filter((c) => c.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter((c) => !c.isActive);
    }

    if (personType !== 'all') {
      filtered = filtered.filter((c) => c.personType === personType);
    }

    if (riskLevel !== 'all') {
      filtered = filtered.filter((c) => c.riskLevel?.code === riskLevel);
    }

    return filtered;
  });

  readonly activeCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients)
      ? clients.filter((c) => c.isActive).length
      : 0;
  });

  readonly highRiskCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients)
      ? clients.filter((c) => c.riskLevel?.code === 'HIGH').length
      : 0;
  });

  readonly lowRiskCount = computed(() => {
    const clients = this.clients();
    return Array.isArray(clients)
      ? clients.filter((c) => c.riskLevel?.code === 'LOW').length
      : 0;
  });

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadAdvisors();
    this.loadClients();
    this.redirectFromQueryParam();
  }

  /** F18 — al llegar desde un resultado de búsqueda global (?openId=), abre
   * la ficha de ese cliente directamente. */
  private redirectFromQueryParam(): void {
    const openId = this.route.snapshot.queryParamMap.get('openId');
    if (!openId) {
      return;
    }
    this.router.navigate(['/clientes', openId]);
  }

  loadCatalogs(): void {
    this.catalogsService
      .getActiveCatalog('document_type')
      .subscribe((items) => this.documentTypes.set(items));
    this.catalogsService
      .getActiveCatalog('risk_level')
      .subscribe((items) => this.riskLevels.set(items));
  }

  loadAdvisors(): void {
    this.advisorsService
      .getAdvisors(1, 100, { isActive: true })
      .subscribe((response) => this.advisors.set(response.advisors || []));
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientsService
      .getClients(this.currentPage(), this.pageSize)
      .subscribe({
        next: (response) => {
          this.clients.set(
            Array.isArray(response.clients) ? response.clients : [],
          );
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
      this.cancelCreate();
    }
  }

  cancelCreate(): void {
    this.clientForm.reset({
      personType: ClientPersonType.NATURAL,
      fullName: '',
      address: '',
      documentTypeId: '',
      identificationNumber: '',
      riskLevelId: '',
      advisorIds: [],
    });
    this.errorMessage.set(null);
    this.panelOpen.set(false);
  }

  onAdvisorIdsChange(advisorIds: string[]): void {
    this.clientForm.patchValue({ advisorIds });
  }

  submitClient(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.clientForm.getRawValue();

    const createData: CreateClientRequest = {
      personType: formValue.personType,
      fullName: formValue.fullName,
      address: formValue.address || undefined,
      documentTypeId: formValue.documentTypeId || undefined,
      identificationNumber: formValue.identificationNumber,
      riskLevelId: formValue.riskLevelId || undefined,
      advisorIds: formValue.advisorIds?.length ? formValue.advisorIds : undefined,
    };

    this.clientsService.createClient(createData).subscribe({
      next: (client) => {
        this.loadClients();
        this.cancelCreate();
        this.isSubmitting.set(false);
        this.router.navigate(['/clientes', client.id]);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al crear cliente');
        this.isSubmitting.set(false);
      },
    });
  }

  async toggleClientStatus(client: ClientResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: client.isActive ? 'Desactivar cliente' : 'Activar cliente',
      message: `¿Estás seguro de ${client.isActive ? 'desactivar' : 'activar'} a ${client.fullName}?`,
      danger: client.isActive,
    });
    if (!confirmed) {
      return;
    }

    this.clientsService.toggleActive(client.id).subscribe({
      next: () => {
        this.loadClients();
      },
      error: (error) => {
        // BUG-20 ola 1: alert() nativo reemplazado por ToastService.
        this.toast.error(error.message || 'Error al cambiar estado del cliente');
      },
    });
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
