import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeadlineResponse } from '../../../core/models/deadline.model';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { getDeadlineStatusClasses, getDeadlineStatusLabel } from '../../../core/utils/deadline-format.util';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "today-deadlines" del catálogo (ver docs/05-features/F32): "Hoy",
 * plazos y audiencias con vencimiento el día de hoy.
 */
@Component({
  selector: 'app-dashboard-today-deadlines-widget',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-text">Hoy</h3>
          <p class="text-sm text-subtle">Plazos y audiencias con vencimiento el día de hoy.</p>
        </div>
        <div class="flex flex-shrink-0 items-center gap-3">
          @if (!isLoading()) {
            <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
              {{ deadlines().length }} {{ deadlines().length === 1 ? 'evento' : 'eventos' }}
            </span>
          }
          <a routerLink="/calendario" class="text-xs font-semibold text-primary underline"> Ver calendario </a>
        </div>
      </header>

      @if (isLoading()) {
        <div class="space-y-3">
          @for (i of [1, 2]; track i) {
            <div class="h-14 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (deadlines().length === 0) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          No tienes plazos ni audiencias programadas para hoy.
        </p>
      } @else {
        <div class="space-y-3">
          @for (deadline of deadlines(); track deadline.id) {
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default bg-surface-muted px-4 py-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-text">{{ deadline.title }}</p>
                  @if (deadline.type) {
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getCatalogBadgeClasses(deadline.type.color)">
                      {{ deadline.type.label }}
                    </span>
                  }
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getDeadlineStatusClasses(deadline.status)">
                    {{ getDeadlineStatusLabel(deadline.status) }}
                  </span>
                </div>
                <p class="truncate text-xs text-subtle">{{ deadline.process?.title }}</p>
              </div>
              <span class="flex-shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted tabular-data">
                {{ deadline.dueAt | date: 'HH:mm' }}
              </span>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class DashboardTodayDeadlinesWidgetComponent {
  deadlines = input<DeadlineResponse[]>([]);
  isLoading = input(false);

  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;
}
