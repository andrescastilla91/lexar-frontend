import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { ClientResponse } from '../../../core/models/client-backend.model';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';

@Component({
  selector: 'app-clients-table',
  standalone: true,
  imports: [RouterLink, HasPermissionDirective],
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
              <th class="px-6 py-4">Tipo</th>
              <th class="px-6 py-4">Vinculación</th>
              <th class="px-6 py-4">Asesores</th>
              <th class="px-6 py-4">Criticidad</th>
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
                  {{ client.personType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                    [class]="contractTypeBadgeClasses(client)"
                  >
                    {{ contractTypeLabel(client) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-muted">
                  @if (client.advisors && client.advisors.length > 0) {
                    {{ formatAdvisors(client) }}
                  } @else {
                    <span class="text-subtle">Sin asignar</span>
                  }
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
                    <a
                      *hasPermission="'clients.view'"
                      [routerLink]="['/clientes', client.id]"
                      class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                      title="Ver ficha"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </a>
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
                <span class="text-xs font-medium text-subtle">Tipo:</span>
                <span class="ml-2 text-xs text-muted">{{ client.personType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}</span>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Vinculación:</span>
                <span
                  class="ml-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                  [class]="contractTypeBadgeClasses(client)"
                >
                  {{ contractTypeLabel(client) }}
                </span>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Asesores:</span>
                <span class="ml-2 text-xs text-muted">
                  @if (client.advisors && client.advisors.length > 0) {
                    {{ formatAdvisors(client) }}
                  } @else {
                    Sin asignar
                  }
                </span>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Criticidad:</span>
                <span
                  class="ml-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                  [class]="getCatalogBadgeClasses(client.riskLevel?.color)"
                >
                  {{ client.riskLevel?.label || 'N/A' }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <a
                *hasPermission="'clients.view'"
                [routerLink]="['/clientes', client.id]"
                class="flex-1 rounded-md border border-default px-3 py-2 text-center text-xs font-medium text-muted transition hover:bg-surface-muted"
              >
                Ver ficha
              </a>
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

  toggleStatus = output<ClientResponse>();

  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;

  /** Angular templates no soportan arrow functions en expresiones — de ahí
   * este método en vez del `.map(...).join(...)` inline que rompía el build. */
  protected formatAdvisors(client: ClientResponse): string {
    return (client.advisors ?? [])
      .map((advisor) => `${advisor.firstName} ${advisor.lastName}`)
      .join(', ');
  }

  /** F34 §4: columna "tipo de vinculación" — `contractTypeSummary` es un
   * `CatalogRef` cuando todos los asuntos no cerrados del cliente comparten
   * un tipo, el string `'VARIOS'` cuando hay más de uno, o `null`/`undefined`
   * cuando el cliente no tiene ningún asunto con tipo asignado. */
  protected contractTypeLabel(client: ClientResponse): string {
    const summary = client.contractTypeSummary;
    if (summary === 'VARIOS') {
      return 'Varios';
    }
    return summary?.label || 'Sin asunto';
  }

  protected contractTypeBadgeClasses(client: ClientResponse): string {
    const summary = client.contractTypeSummary;
    if (summary === 'VARIOS') {
      return 'bg-surface-muted text-text';
    }
    return getCatalogBadgeClasses(summary?.color ?? null);
  }
}
