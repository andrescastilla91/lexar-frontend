/**
 * EJEMPLO DE USO: DataTableComponent con Clientes
 * 
 * Este archivo muestra cómo implementar el DataTableComponent
 * en un componente de gestión de clientes.
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent, TableColumn } from '../../core/components';
import { ClientsService } from '../../core/services/clients.service';
import { ClientResponse, RiskLevel, DocumentType } from '../../core/models/client-backend.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-clients-example',
  standalone: true,
  imports: [CommonModule, DataTableComponent, HasPermissionDirective],
  template: `
    <div class="space-y-6">
      <header>
        <h2>Gestión de clientes</h2>
        <button (click)="openCreateModal()">Nuevo cliente</button>
      </header>

      <!-- Filtros... -->

      <!-- Tabla con DataTableComponent -->
      <app-data-table
        [data]="filteredClients()"
        [columns]="columns"
        [isLoading]="isLoading()"
        [total]="total()"
        [currentPage]="currentPage()"
        [pageSize]="pageSize"
        [totalPages]="totalPages()"
        itemLabel="clientes"
        emptyMessage="No se encontraron clientes"
        (nextPage)="nextPage()"
        (previousPage)="previousPage()"
      >
        <!-- Template personalizado para la celda de cliente -->
        <ng-template #cellClient let-client>
          <div>
            <p class="font-semibold text-slate-800">{{ client.fullName }}</p>
            <p class="text-sm text-slate-500">
              {{ getDocumentTypeLabel(client.documentType) }}: {{ client.identificationNumber }}
            </p>
          </div>
        </ng-template>

        <!-- Template personalizado para contacto -->
        <ng-template #cellContact let-client>
          <p class="text-sm text-slate-800">{{ client.email }}</p>
          <p class="text-sm text-slate-500">{{ client.phone || 'N/A' }}</p>
        </ng-template>

        <!-- Template personalizado para riesgo -->
        <ng-template #cellRisk let-client>
          <span
            class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
            [class]="{
              'bg-emerald-100 text-emerald-700': client.riskLevel === 'LOW',
              'bg-amber-100 text-amber-700': client.riskLevel === 'MEDIUM',
              'bg-rose-100 text-rose-700': client.riskLevel === 'HIGH'
            }"
          >
            {{ getRiskLevelLabel(client.riskLevel) }}
          </span>
        </ng-template>

        <!-- Template personalizado para estado -->
        <ng-template #cellStatus let-client>
          <span
            class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
            [class]="client.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
          >
            {{ client.isActive ? 'Activo' : 'Inactivo' }}
          </span>
        </ng-template>

        <!-- Acciones en desktop -->
        <ng-template #actions let-client>
          <button
            *hasPermission="'clients.edit'"
            type="button"
            (click)="editClient(client)"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
            [class]="client.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'"
            [title]="client.isActive ? 'Desactivar' : 'Activar'"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path *ngIf="client.isActive" stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              <path *ngIf="!client.isActive" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
        </ng-template>

        <!-- Acciones en mobile (opcional, usa el mismo si no se define) -->
        <ng-template #mobileActions let-client>
          <button
            *hasPermission="'clients.edit'"
            (click)="editClient(client)"
            class="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs"
          >
            Editar
          </button>
          <button
            *hasPermission="['clients.activate', 'clients.deactivate']"
            (click)="toggleClientStatus(client)"
            class="flex-1 rounded-2xl border px-3 py-2 text-xs"
          >
            {{ client.isActive ? 'Desactivar' : 'Activar' }}
          </button>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class ClientsExampleComponent implements OnInit {
  private readonly clientsService = inject(ClientsService);

  readonly clients = signal<ClientResponse[]>([]);
  readonly isLoading = signal(false);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  // Configuración de columnas
  readonly columns: TableColumn<ClientResponse>[] = [
    {
      key: 'client',
      header: 'Cliente',
      width: '25%',
    },
    {
      key: 'companyName',
      header: 'Empresa',
      hideOnMobile: true,
      value: (client) => client.companyName || 'N/A',
    },
    {
      key: 'contact',
      header: 'Contacto',
    },
    {
      key: 'risk',
      header: 'Riesgo',
      align: 'center',
    },
    {
      key: 'status',
      header: 'Estado',
      align: 'center',
    },
  ];

  // Computed para filtros (simplificado)
  readonly filteredClients = computed(() => {
    return this.clients();
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.clientsService.getClients(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.clients.set(response.clients);
        this.total.set(response.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadClients();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadClients();
    }
  }

  editClient(client: ClientResponse): void {
    console.log('Editar:', client);
  }

  toggleClientStatus(client: ClientResponse): void {
    console.log('Toggle status:', client);
  }

  openCreateModal(): void {
    console.log('Abrir modal de creación');
  }

  getRiskLevelLabel(riskLevel: RiskLevel): string {
    const labels: Record<RiskLevel, string> = {
      LOW: 'Bajo',
      MEDIUM: 'Medio',
      HIGH: 'Alto',
    };
    return labels[riskLevel];
  }

  getDocumentTypeLabel(documentType: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      CC: 'Cédula',
      NIT: 'NIT',
    };
    return labels[documentType];
  }
}
