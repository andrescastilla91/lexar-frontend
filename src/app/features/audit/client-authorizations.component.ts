import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../core/components/pagination.component';
import { LegalComplianceService } from '../../core/services/legal-compliance.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ClientAuthorizationRecord,
  ClientAuthorizationStatus,
  ClientAuthorizationsFilters,
  DataProcessingAuthorizationMethodCode,
} from '../../core/models/legal-compliance.model';
import { downloadBlob, todayStamp } from '../../core/utils/blob-download.util';
import { AuditTabsComponent } from './audit-tabs.component';

@Component({
  selector: 'app-client-authorizations',
  standalone: true,
  imports: [FormsModule, HasPermissionDirective, PaginationComponent, AuditTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section *hasPermission="['audit.view']" class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Auditoría</h2>
          <p class="text-sm text-subtle">
            Estado de la autorización de tratamiento de datos de cada cliente activo, con su medio y soporte.
          </p>
        </div>
        <button
          type="button"
          (click)="exportCsv()"
          [disabled]="exporting()"
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ exporting() ? 'Exportando…' : 'Exportar CSV' }}
        </button>
      </header>

      <app-audit-tabs />

      <div class="grid grid-cols-1 gap-3 rounded-md border border-default bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label for="ca-from" class="mb-1 block text-xs font-medium text-subtle">Autorizada desde</label>
          <input
            id="ca-from"
            type="date"
            [(ngModel)]="fromDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="ca-to" class="mb-1 block text-xs font-medium text-subtle">Autorizada hasta</label>
          <input
            id="ca-to"
            type="date"
            [(ngModel)]="toDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="ca-status" class="mb-1 block text-xs font-medium text-subtle">Estado</label>
          <select
            id="ca-status"
            [(ngModel)]="status"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los estados</option>
            <option value="authorized">Autorización obtenida</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        <div>
          <label for="ca-method" class="mb-1 block text-xs font-medium text-subtle">Medio</label>
          <select
            id="ca-method"
            [(ngModel)]="method"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los medios</option>
            <option value="FISICA">Física</option>
            <option value="DIGITAL">Digital</option>
          </select>
        </div>
        <div>
          <label for="ca-search" class="mb-1 block text-xs font-medium text-subtle">Nombre o identificación</label>
          <input
            id="ca-search"
            type="search"
            [(ngModel)]="search"
            (keyup.enter)="applyFilters()"
            (blur)="applyFilters()"
            maxlength="100"
            placeholder="Buscar…"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (records().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay clientes con estos filtros.</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-default bg-surface shadow-card">
          <table class="w-full min-w-[720px]">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th class="px-6 py-4">Cliente</th>
                <th class="px-6 py-4">Estado</th>
                <th class="px-6 py-4">Fecha</th>
                <th class="px-6 py-4">Medio</th>
                <th class="px-6 py-4">Soporte adjunto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              @for (record of records(); track record.clientId) {
                <tr>
                  <td class="px-6 py-4 text-sm text-text">
                    {{ record.fullName }}
                    <span class="block text-xs text-subtle">{{ record.identificationNumber }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span
                      class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      [class]="record.authorized ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning'"
                    >
                      {{ record.authorized ? 'Obtenida' : 'Pendiente' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-subtle">{{ formatDate(record.authorizedAt) }}</td>
                  <td class="px-6 py-4 text-sm text-text">{{ record.methodLabel || '—' }}</td>
                  <td class="px-6 py-4 text-sm text-text">
                    @if (record.attachment) {
                      {{ record.attachment.originalFilename }}
                    } @else {
                      <span class="text-subtle">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [total]="total()"
          [currentPage]="page()"
          [pageSize]="limit"
          [currentItems]="records().length"
          [totalPages]="totalPages()"
          itemLabel="clientes"
          (previousPage)="goToPage(page() - 1)"
          (nextPage)="goToPage(page() + 1)"
        />
      }
    </section>
  `,
})
export class ClientAuthorizationsComponent implements OnInit {
  private readonly complianceService = inject(LegalComplianceService);
  private readonly toast = inject(ToastService);

  readonly limit = 20;

  readonly records = signal<ClientAuthorizationRecord[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(false);
  readonly exporting = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  fromDate = '';
  toDate = '';
  status: ClientAuthorizationStatus | '' = '';
  method: DataProcessingAuthorizationMethodCode | '' = '';
  search = '';

  private lastAppliedKey = '';

  ngOnInit(): void {
    this.loadPage(1);
  }

  applyFilters(): void {
    const key = JSON.stringify(this.buildFilters());
    if (key === this.lastAppliedKey) {
      return;
    }
    this.loadPage(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.loadPage(page);
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.complianceService.exportClientAuthorizations(this.buildFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `autorizaciones-clientes-${todayStamp()}.csv`);
      },
      error: (err: Error) => {
        this.exporting.set(false);
        this.toast.error(err.message || 'No se pudo exportar el registro de autorizaciones');
      },
    });
  }

  formatDate(date: string | null): string {
    if (!date) {
      return '—';
    }
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private buildFilters(): ClientAuthorizationsFilters {
    const search = this.search.trim();
    return {
      from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
      to: this.toDate ? endOfDayIso(this.toDate) : undefined,
      status: this.status || undefined,
      method: this.method || undefined,
      search: search || undefined,
    };
  }

  private loadPage(page: number): void {
    const filters = this.buildFilters();
    this.lastAppliedKey = JSON.stringify(filters);
    this.isLoading.set(true);
    this.complianceService.findClientAuthorizations(filters, page, this.limit).subscribe({
      next: (res) => {
        this.records.set(res.authorizations);
        this.total.set(res.total);
        this.page.set(res.page);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('No se pudo cargar el registro de autorizaciones');
      },
    });
  }
}

function endOfDayIso(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
