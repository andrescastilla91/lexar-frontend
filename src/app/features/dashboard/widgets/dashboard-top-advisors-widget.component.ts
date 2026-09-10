import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardSummary } from '../../../core/models/dashboard.model';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "top-advisors" del catálogo (ver docs/05-features/F32).
 */
@Component({
  selector: 'app-dashboard-top-advisors-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-text">Asesores destacados</h3>
          <p class="text-sm text-subtle">Calificación y experiencia de tu equipo activo.</p>
        </div>
        @if (!isLoading()) {
          <span class="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent tabular-data">
            {{ summary()?.topAdvisors?.length ?? 0 }} perfiles
          </span>
        }
      </header>

      @if (isLoading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-12 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (!summary()?.topAdvisors?.length) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          No hay asesores activos registrados.
        </p>
      } @else {
        <div class="space-y-4">
          @for (advisor of summary()!.topAdvisors; track advisor.id) {
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default px-4 py-3 text-sm text-muted">
              <div class="min-w-0">
                <p class="truncate font-semibold text-text">{{ advisor.name }}</p>
                <p class="truncate text-xs text-subtle">{{ advisor.specialty?.label || 'N/A' }}</p>
              </div>
              <div class="flex items-center gap-3 text-xs text-subtle">
                <span class="flex items-center gap-1 text-accent">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                  </svg>
                  <span class="tabular-data">{{ advisor.rating }}</span>
                </span>
                <span class="tabular-data">{{ advisor.experienceYears }} años exp.</span>
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class DashboardTopAdvisorsWidgetComponent {
  summary = input<DashboardSummary | null>(null);
  isLoading = input(false);
}
