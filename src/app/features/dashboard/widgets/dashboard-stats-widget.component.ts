import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardSummary } from '../../../core/models/dashboard.model';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  UNDER_REVIEW: 'En revisión',
  SUSPENDED: 'Suspendido',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  ARCHIVED: 'Archivado',
};

interface StatCardView {
  title: string;
  value: number;
  description: string;
  trend: string;
  trendClass: string;
}

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "stats" del catálogo (ver docs/05-features/F32): fila de chips por
 * estado de proceso + los 4 KPI de la grilla de tarjetas.
 */
@Component({
  selector: 'app-dashboard-stats-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isLoading() && summary()?.processesByStatus?.length) {
      <section class="flex flex-wrap gap-3">
        @for (item of summary()!.processesByStatus; track item.status) {
          <span class="rounded-md border border-default bg-surface px-4 py-2 text-xs font-semibold text-muted">
            {{ statusLabel(item.status) }}
            <span class="ml-1 tabular-data text-text">{{ item.count }}</span>
          </span>
        }
      </section>
    }

    <section class="mt-6 grid gap-6 lg:grid-cols-4">
      @if (isLoading()) {
        @for (i of [1, 2, 3, 4]; track i) {
          <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
            <div class="h-4 w-24 animate-pulse rounded bg-surface-sunken"></div>
            <div class="mt-4 h-8 w-16 animate-pulse rounded bg-surface-sunken"></div>
            <div class="mt-3 h-3 w-32 animate-pulse rounded bg-surface-sunken"></div>
          </article>
        }
      } @else {
        @for (card of statCards(); track card.title) {
          <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-muted">{{ card.title }}</h3>
              <span class="text-xs font-semibold" [class]="card.trendClass">{{ card.trend }}</span>
            </div>
            <p class="mt-4 text-3xl font-semibold text-text tabular-data">{{ card.value }}</p>
            <p class="mt-2 text-sm text-subtle">{{ card.description }}</p>
          </article>
        }
      }
    </section>
  `,
})
export class DashboardStatsWidgetComponent {
  summary = input<DashboardSummary | null>(null);
  isLoading = input(false);

  readonly statCards = computed<StatCardView[]>(() => {
    const summary = this.summary();
    if (!summary) {
      return [];
    }

    return [
      {
        title: 'Procesos totales',
        value: summary.totalProcesses,
        description: 'Casos monitorizados en todas las áreas jurídicas.',
        trend: 'Actualizado',
        trendClass: 'text-xs font-semibold text-success',
      },
      {
        title: 'Clientes activos',
        value: summary.activeClients,
        description: 'Cuentas activas con relación vigente.',
        trend: 'En gestión',
        trendClass: 'text-xs font-semibold text-info',
      },
      {
        title: 'Audiencias próximas',
        value: summary.upcomingHearingsCount,
        description: 'Eventos confirmados en los próximos 30 días.',
        trend: summary.upcomingHearingsCount > 0 ? 'Agenda activa' : 'Sin eventos',
        trendClass: 'text-xs font-semibold text-warning',
      },
      {
        title: 'Alertas de riesgo',
        value: summary.highRiskProcessesCount,
        description: 'Procesos que requieren acciones preventivas.',
        trend: summary.highRiskProcessesCount > 0 ? 'Prioriza hoy' : 'Sin alertas',
        trendClass: 'text-xs font-semibold text-danger',
      },
    ];
  });

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }
}
