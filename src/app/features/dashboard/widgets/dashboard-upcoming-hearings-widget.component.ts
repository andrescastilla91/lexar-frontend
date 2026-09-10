import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardSummary } from '../../../core/models/dashboard.model';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "upcoming-hearings" del catálogo (ver docs/05-features/F32).
 */
@Component({
  selector: 'app-dashboard-upcoming-hearings-widget',
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-text">Próximas audiencias</h3>
          <p class="text-sm text-subtle">Agenda de los próximos 30 días.</p>
        </div>
        @if (!isLoading()) {
          <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
            {{ summary()?.upcomingHearingsCount ?? 0 }} eventos
          </span>
        }
      </header>

      @if (isLoading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-16 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (!summary()?.upcomingHearings?.length) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          No hay audiencias programadas en los próximos 30 días.
        </p>
      } @else {
        <div class="space-y-4">
          @for (hearing of summary()!.upcomingHearings; track hearing.id) {
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-default bg-surface-muted px-4 py-4 text-sm text-muted">
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-text">{{ hearing.title }}</p>
                <p class="truncate text-xs uppercase tracking-wide text-subtle">{{ hearing.court || 'Sin jurisdicción asignada' }}</p>
                <p class="mt-1 truncate text-xs text-subtle">{{ advisorInitials(hearing.advisors) }} • {{ hearing.client?.fullName ?? 'Cliente sin asignar' }}</p>
              </div>
              @if (hearing.nextHearingDate) {
                <span class="flex-shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted tabular-data">
                  {{ hearing.nextHearingDate | date: 'dd/MM' }}
                </span>
              }
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class DashboardUpcomingHearingsWidgetComponent {
  summary = input<DashboardSummary | null>(null);
  isLoading = input(false);

  advisorInitials(advisors: { firstName: string; lastName: string }[]): string {
    if (!advisors.length) {
      return 'NA';
    }
    const advisor = advisors[0];
    return `${advisor.firstName.charAt(0)}${advisor.lastName.charAt(0)}`.toUpperCase();
  }
}
