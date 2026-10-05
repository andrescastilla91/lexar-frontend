import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../core/components/pagination.component';
import { LegalComplianceService } from '../../core/services/legal-compliance.service';
import { ToastService } from '../../core/services/toast.service';
import { LEGAL_DOCUMENT_TYPE_OPTIONS, LegalDocumentType } from '../../core/models/admin.model';
import {
  LegalAcceptanceRecord,
  LegalAcceptanceSubjectKind,
  LegalAcceptancesFilters,
} from '../../core/models/legal-compliance.model';
import { downloadBlob, todayStamp } from '../../core/utils/blob-download.util';
import { AuditTabsComponent } from './audit-tabs.component';

@Component({
  selector: 'app-legal-acceptances',
  standalone: true,
  imports: [FormsModule, HasPermissionDirective, PaginationComponent, AuditTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section *hasPermission="['audit.view']" class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Auditoría</h2>
          <p class="text-sm text-subtle">
            Quién aceptó qué versión de los términos legales, cuándo y desde dónde — evidencia de cumplimiento.
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
          <label for="la-from" class="mb-1 block text-xs font-medium text-subtle">Desde</label>
          <input
            id="la-from"
            type="date"
            [(ngModel)]="fromDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="la-to" class="mb-1 block text-xs font-medium text-subtle">Hasta</label>
          <input
            id="la-to"
            type="date"
            [(ngModel)]="toDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="la-doc" class="mb-1 block text-xs font-medium text-subtle">Documento</label>
          <select
            id="la-doc"
            [(ngModel)]="documentType"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los documentos</option>
            @for (opt of documentTypeOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
        <div>
          <label for="la-kind" class="mb-1 block text-xs font-medium text-subtle">Aceptante</label>
          <select
            id="la-kind"
            [(ngModel)]="subjectKind"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Usuarios y clientes</option>
            <option value="user">Usuarios internos</option>
            <option value="portal">Clientes del portal</option>
          </select>
        </div>
        <div>
          <label for="la-search" class="mb-1 block text-xs font-medium text-subtle">Nombre o correo</label>
          <input
            id="la-search"
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
          <p class="text-subtle">No hay aceptaciones registradas con estos filtros.</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-default bg-surface shadow-card">
          <table class="w-full min-w-[720px]">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th class="px-6 py-4">Fecha</th>
                <th class="px-6 py-4">Documento</th>
                <th class="px-6 py-4">Aceptante</th>
                <th class="px-6 py-4">Origen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              @for (record of records(); track record.id) {
                <tr>
                  <td class="px-6 py-4 text-sm text-subtle">{{ formatDateTime(record.acceptedAt) }}</td>
                  <td class="px-6 py-4 text-sm text-text">
                    {{ record.documentTypeLabel }}
                    <span class="block text-xs text-subtle">Versión {{ record.documentVersion }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-text">
                    {{ record.subjectName || 'Sin nombre' }}
                    <span class="ml-2 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                      {{ record.subjectKind === 'user' ? 'Usuario interno' : 'Cliente del portal' }}
                    </span>
                    @if (record.subjectEmail) {
                      <span class="block text-xs text-subtle">{{ record.subjectEmail }}</span>
                    }
                  </td>
                  <td class="px-6 py-4 text-sm text-text">
                    {{ record.ip || 'IP no registrada' }}
                    @if (record.userAgent) {
                      <span class="block max-w-xs truncate text-xs text-subtle" [title]="record.userAgent">{{ record.userAgent }}</span>
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
          itemLabel="aceptaciones"
          (previousPage)="goToPage(page() - 1)"
          (nextPage)="goToPage(page() + 1)"
        />
      }
    </section>
  `,
})
export class LegalAcceptancesComponent implements OnInit {
  private readonly complianceService = inject(LegalComplianceService);
  private readonly toast = inject(ToastService);

  readonly documentTypeOptions = LEGAL_DOCUMENT_TYPE_OPTIONS;
  readonly limit = 20;

  readonly records = signal<LegalAcceptanceRecord[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(false);
  readonly exporting = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  fromDate = '';
  toDate = '';
  documentType: LegalDocumentType | '' = '';
  subjectKind: LegalAcceptanceSubjectKind | '' = '';
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
    this.complianceService.exportAcceptances(this.buildFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `aceptaciones-legales-${todayStamp()}.csv`);
      },
      error: (err: Error) => {
        this.exporting.set(false);
        this.toast.error(err.message || 'No se pudo exportar el registro de aceptaciones');
      },
    });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildFilters(): LegalAcceptancesFilters {
    const search = this.search.trim();
    return {
      from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
      to: this.toDate ? endOfDayIso(this.toDate) : undefined,
      documentType: this.documentType || undefined,
      subjectKind: this.subjectKind || undefined,
      search: search || undefined,
    };
  }

  private loadPage(page: number): void {
    const filters = this.buildFilters();
    this.lastAppliedKey = JSON.stringify(filters);
    this.isLoading.set(true);
    this.complianceService.findAcceptances(filters, page, this.limit).subscribe({
      next: (res) => {
        this.records.set(res.acceptances);
        this.total.set(res.total);
        this.page.set(res.page);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('No se pudo cargar el registro de aceptaciones');
      },
    });
  }
}

function endOfDayIso(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
