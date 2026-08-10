import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { AdminMetrics } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-metrics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-xl font-semibold text-text">Métricas</h1>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando métricas…</p>
      } @else if (metrics(); as m) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div class="rounded-lg border border-default bg-surface p-4">
            <p class="text-xs uppercase text-subtle">Tenants totales</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ m.tenantsTotal }}</p>
          </div>
          <div class="rounded-lg border border-default bg-surface p-4">
            <p class="text-xs uppercase text-subtle">Activos</p>
            <p class="mt-1 text-2xl font-semibold text-success">{{ m.tenantsActive }}</p>
          </div>
          <div class="rounded-lg border border-default bg-surface p-4">
            <p class="text-xs uppercase text-subtle">En trial</p>
            <p class="mt-1 text-2xl font-semibold text-info">{{ m.tenantsTrialing }}</p>
          </div>
          <div class="rounded-lg border border-default bg-surface p-4">
            <p class="text-xs uppercase text-subtle">Suspendidos</p>
            <p class="mt-1 text-2xl font-semibold text-danger">{{ m.tenantsSuspended }}</p>
          </div>
          <div class="rounded-lg border border-default bg-surface p-4">
            <p class="text-xs uppercase text-subtle">MRR</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ formatPrice(m.mrr) }}</p>
          </div>
        </div>

        <div class="rounded-lg border border-default bg-surface p-5">
          <h2 class="text-sm font-semibold text-text">Altas por mes</h2>
          @if (m.signupsByMonth.length === 0) {
            <p class="mt-2 text-sm text-subtle">Sin datos en los últimos 12 meses.</p>
          } @else {
            <div class="mt-4 flex items-end gap-2" style="height: 160px">
              @for (row of m.signupsByMonth; track row.month) {
                <div class="flex flex-1 flex-col items-center gap-1">
                  <div
                    class="w-full rounded-t bg-navy-900"
                    [style.height.%]="barHeight(row.count, m.signupsByMonth)"
                  ></div>
                  <span class="text-[10px] text-subtle">{{ row.month.slice(5) }}</span>
                  <span class="text-[10px] font-semibold text-text">{{ row.count }}</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminMetricsComponent implements OnInit {
  private readonly platformAdminService = inject(PlatformAdminService);

  readonly isLoading = signal(true);
  readonly metrics = signal<AdminMetrics | null>(null);

  ngOnInit(): void {
    this.platformAdminService.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  barHeight(count: number, all: Array<{ count: number }>): number {
    const max = Math.max(...all.map((row) => row.count), 1);
    return Math.max(4, Math.round((count / max) * 100));
  }
}
