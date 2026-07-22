import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { ClientResponse } from '../../../core/models/client-backend.model';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';

@Component({
  selector: 'app-clients-table',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (clients().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">No se encontraron clientes</p>
      </div>
    } @else {
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
            @for (client of clients(); track client.id) {
              <tr class="transition hover:bg-surface-muted">
                <td class="px-6 py-4">
                  <div>
                    <p class="font-semibold text-text">{{ client.fullName }}</p>
                    <p class="text-sm text-subtle">
                      {{ client.documentType?.label || 'N/A' }}: {{ client.identificationNumber }}
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
                    [class]="getCatalogBadgeClasses(client.riskLevel?.color)"
                  >
                    {{ client.riskLevel?.label || 'N/A' }}
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
                      (click)="edit.emit(client)"
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
                      (click)="toggleStatus.emit(client)"
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

      <div class="grid gap-4 md:hidden">
        @for (client of clients(); track client.id) {
          <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
            <div class="mb-3 flex items-start justify-between">
              <div>
                <p class="font-semibold text-text">{{ client.fullName }}</p>
                <p class="text-sm text-subtle">
                  {{ client.documentType?.label || 'N/A' }}: {{ client.identificationNumber }}
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
                  [class]="getCatalogBadgeClasses(client.riskLevel?.color)"
                >
                  {{ client.riskLevel?.label || 'N/A' }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                *hasPermission="'clients.edit'"
                type="button"
                (click)="edit.emit(client)"
                class="flex-1 rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
              >
                Editar
              </button>
              <button
                *hasPermission="['clients.activate', 'clients.deactivate']"
                type="button"
                (click)="toggleStatus.emit(client)"
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
  `,
})
export class ClientsTableComponent {
  clients = input.required<ClientResponse[]>();
  isLoading = input(false);

  edit = output<ClientResponse>();
  toggleStatus = output<ClientResponse>();

  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
}
