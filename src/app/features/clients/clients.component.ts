import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ClientsService } from '../../core/services/clients.service';
import { ClientResponse, CreateClientRequest, UpdateClientRequest, RiskLevel, DocumentType } from '../../core/models/client-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../core/components/pagination.component';
import { ClientFormComponent } from './components/client-form.component';
import { ClientsTableComponent } from './components/clients-table.component';
import { identificationNumberValidator } from './utils/identification-number.validator';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective, PaginationComponent, ClientFormComponent, ClientsTableComponent],
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

      <app-client-form
        [form]="clientForm"
        [isOpen]="panelOpen()"
        [isEditing]="!!editingClient()"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        [editingClientId]="editingClient()?.id ?? null"
        (cancel)="cancelEdit()"
        (submit)="submitClient()"
      />

      <app-clients-table
        [clients]="filteredClients()"
        [isLoading]="isLoading()"
        (edit)="editClient($event)"
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
  private readonly confirmDialog = inject(ConfirmDialogService);

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
    validators: [identificationNumberValidator]
  });

  readonly filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    { initialValue: this.filterForm.value }
  );

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
        alert(error.message || 'Error al cambiar estado del cliente');
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
