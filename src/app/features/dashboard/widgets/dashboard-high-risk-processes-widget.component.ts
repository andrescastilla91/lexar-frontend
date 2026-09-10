import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardSummary } from '../../../core/models/dashboard.model';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "high-risk-processes" del catálogo (ver docs/05-features/F32).
 */
@Component({
  selector: 'app-dashboard-high-risk-processes-widget',
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-text">Procesos con riesgo alto</h3>
          <p class="text-sm text-subtle">Prioriza tareas preventivas para mitigar contingencias.</p>
        </div>
        @if (!isLoading()) {
          <span class="rounded-full bg-danger-tint px-3 py-1 text-xs font-semibold text-danger tabular-data">
            {{ summary()?.highRiskProcessesCount ?? 0 }} activos
          </span>
        }
      </header>

      @if (isLoading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-16 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (!summary()?.highRiskProcesses?.length) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          No hay procesos de riesgo alto en este momento.
        </p>
      } @else {
        <div class="space-y-4">
          @for (process of summary()!.highRiskProcesses; track process.id) {
            <div class="rounded-lg bg-danger-tint px-4 py-4 text-sm text-danger">
              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold text-danger">{{ process.title }}</p>
                  <p class="truncate text-xs uppercase tracking-wide text-danger/80">{{ process.court || 'Sin jurisdicción asignada' }}</p>
                </div>
                <div class="flex flex-wrap gap-4 text-xs text-danger/90 sm:gap-6">
                  @if (process.nextHearingDate) {
                    <span class="flex items-center gap-2">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                      </svg>
                      Audiencia {{ process.nextHearingDate | date: 'longDate' }}
                    </span>
                  }
                  <span class="flex items-center gap-2">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m12 6 7.5 12h-15L12 6z" />
                    </svg>
                    Riesgo {{ process.riskLevel?.label || 'N/A' }}
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class DashboardHighRiskProcessesWidgetComponent {
  summary = input<DashboardSummary | null>(null);
  isLoading = input(false);
}
