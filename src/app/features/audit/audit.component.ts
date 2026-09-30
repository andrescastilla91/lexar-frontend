import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { AuditService } from '../../core/services/audit.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../core/components/pagination.component';
import { AuditLogEntry, AuditLogFilters } from '../../core/models/audit-log.model';
import { AssignableUser } from '../../core/models/user-backend.model';

// F43 §1/§4: opciones curadas para los selectores de filtro — no los ~50
// `action` posibles (inmanejable en un <select>), sino los más frecuentes
// en la práctica de un despacho. El valor enviado es siempre el código
// real que el backend traduce; un filtro por un código fuera de esta
// lista sigue funcionando si se llega por otra vía (p. ej. un link con
// `?action=...`), solo no aparece en el desplegable.
const ACTION_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas las acciones' },
  { value: 'create', label: 'Creación' },
  { value: 'update', label: 'Actualización' },
  { value: 'delete', label: 'Eliminación' },
  { value: 'view', label: 'Consulta' },
  { value: 'download', label: 'Descarga' },
  { value: 'login', label: 'Inicio de sesión' },
  { value: 'login_failed', label: 'Inicio de sesión fallido' },
  { value: 'impersonation_started', label: 'Inicio de impersonación' },
  { value: 'audit_export', label: 'Exportación de auditoría' },
];

const ENTITY_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'file', label: 'Documento' },
  { value: 'client', label: 'Cliente' },
  { value: 'legal_process', label: 'Proceso legal' },
  { value: 'user', label: 'Usuario' },
  { value: 'role', label: 'Rol' },
  { value: 'task', label: 'Tarea' },
  { value: 'deadline', label: 'Plazo' },
  { value: 'company', label: 'Empresa' },
];

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [FormsModule, HasPermissionDirective, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section *hasPermission="['audit.view']" class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Auditoría</h2>
          <p class="text-sm text-subtle">Quién hizo qué, cuándo — registro inalterable de la actividad de la empresa.</p>
        </div>
        <button
          type="button"
          (click)="exportCsv()"
          [disabled]="exporting()"
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {{ exporting() ? 'Exportando…' : 'Exportar CSV' }}
        </button>
      </header>

      <div class="grid grid-cols-1 gap-3 rounded-md border border-default bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label class="mb-1 block text-xs font-medium text-subtle">Desde</label>
          <input
            type="date"
            [(ngModel)]="fromDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-subtle">Hasta</label>
          <input
            type="date"
            [(ngModel)]="toDate"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-subtle">Usuario</label>
          <select
            [(ngModel)]="userId"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los usuarios</option>
            @for (u of users(); track u.id) {
              <option [value]="u.id">{{ u.firstName }} {{ u.lastName }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-subtle">Acción</label>
          <select
            [(ngModel)]="action"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            @for (opt of actionOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-subtle">Tipo de entidad</label>
          <select
            [(ngModel)]="entityType"
            (ngModelChange)="applyFilters()"
            class="w-full rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            @for (opt of entityTypeOptions; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (entries().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay eventos de auditoría con estos filtros.</p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-lg border border-default bg-surface shadow-card">
          <table class="w-full">
            <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th class="px-6 py-4" style="width: 180px">Fecha</th>
                <th class="px-6 py-4">Evento</th>
                <th class="px-6 py-4" style="width: 100px"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              @for (entry of entries(); track entry.id) {
                <tr
                  class="cursor-pointer transition hover:bg-surface-muted"
                  (click)="toggleExpand(entry.id)"
                >
                  <td class="px-6 py-4 text-sm text-subtle">{{ formatDateTime(entry.createdAt) }}</td>
                  <td class="px-6 py-4 text-sm text-text">{{ entry.description }}</td>
                  <td class="px-6 py-4 text-right text-sm font-medium text-primary">
                    {{ isExpanded(entry.id) ? 'Ocultar' : 'Ver detalle' }}
                  </td>
                </tr>
                @if (isExpanded(entry.id)) {
                  <tr class="bg-surface-muted">
                    <td colspan="3" class="px-6 py-4">
                      <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Usuario</dt>
                          <dd class="text-text">{{ entry.userEmail || 'Sistema' }}</dd>
                        </div>
                        <div>
                          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Acción</dt>
                          <dd class="text-text">{{ entry.actionLabel }} <span class="text-subtle">({{ entry.action }})</span></dd>
                        </div>
                        <div>
                          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Entidad</dt>
                          <dd class="text-text">
                            @if (entry.entityTypeLabel) {
                              {{ entry.entityTypeLabel }} <span class="text-subtle">({{ entry.entityType }})</span>
                            } @else {
                              <span class="text-subtle">—</span>
                            }
                            @if (entry.entityId) {
                              <br /><span class="text-xs text-subtle">ID: {{ entry.entityId }}</span>
                            }
                          </dd>
                        </div>
                        <div>
                          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Origen</dt>
                          <dd class="text-text">
                            {{ entry.ip || 'IP no registrada' }}
                            @if (entry.userAgent) {
                              <br /><span class="text-xs text-subtle">{{ entry.userAgent }}</span>
                            }
                          </dd>
                        </div>
                        <div class="sm:col-span-2">
                          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Detalle del cambio</dt>
                          @if (detailEntries(entry.detail).length > 0) {
                            <dd class="mt-1 space-y-1">
                              @for (pair of detailEntries(entry.detail); track pair[0]) {
                                <div class="flex gap-2 text-text">
                                  <span class="font-medium text-subtle">{{ pair[0] }}:</span>
                                  <span class="break-all">{{ formatDetailValue(pair[1]) }}</span>
                                </div>
                              }
                            </dd>
                          } @else {
                            <dd class="text-subtle">Sin detalle adicional registrado.</dd>
                          }
                        </div>
                      </dl>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [total]="total()"
          [currentPage]="page()"
          [pageSize]="limit"
          [currentItems]="entries().length"
          [totalPages]="totalPages()"
          itemLabel="eventos"
          (previousPage)="goToPage(page() - 1)"
          (nextPage)="goToPage(page() + 1)"
        />
      }
    </section>
  `,
})
export class AuditComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);

  readonly actionOptions = ACTION_FILTER_OPTIONS;
  readonly entityTypeOptions = ENTITY_TYPE_FILTER_OPTIONS;
  readonly limit = 20;

  readonly entries = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly isLoading = signal(false);
  readonly exporting = signal(false);
  readonly users = signal<AssignableUser[]>([]);
  readonly expandedId = signal<string | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  fromDate = '';
  toDate = '';
  userId = '';
  action = '';
  entityType = '';

  ngOnInit(): void {
    this.usersService.getAssignableUsers().subscribe({
      next: (res) => this.users.set(res.users),
      error: () => {
        // Filtro por usuario degrada con gracia a "Todos" si no se puede
        // cargar la lista — no bloquea el resto de la pantalla.
      },
    });
    this.loadPage(1);
  }

  applyFilters(): void {
    this.loadPage(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.loadPage(page);
  }

  private buildFilters(): AuditLogFilters {
    return {
      from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
      to: this.toDate ? endOfDayIso(this.toDate) : undefined,
      userId: this.userId || undefined,
      action: this.action || undefined,
      entityType: this.entityType || undefined,
    };
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);
    this.auditService.findAll(this.buildFilters(), page, this.limit).subscribe({
      next: (res) => {
        this.entries.set(res.logs);
        this.total.set(res.total);
        this.page.set(res.page);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('No se pudo cargar el registro de auditoría');
      },
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.auditService.exportCsv(this.buildFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          link.remove();
          URL.revokeObjectURL(url);
        }, 100);
      },
      error: (err: Error) => {
        this.exporting.set(false);
        this.toast.error(err.message || 'No se pudo exportar la auditoría');
      },
    });
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  detailEntries(detail: Record<string, unknown> | null): [string, unknown][] {
    return detail ? Object.entries(detail) : [];
  }

  formatDetailValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
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
}

function endOfDayIso(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
