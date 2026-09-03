import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardSummary } from '../../../core/models/dashboard.model';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "recent-documents" del catálogo (ver docs/05-features/F32).
 */
@Component({
  selector: 'app-dashboard-recent-documents-widget',
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-text">Documentos recientes</h3>
          <p class="text-sm text-subtle">{{ summary()?.documentsThisMonth ?? 0 }} archivos subidos este mes.</p>
        </div>
        @if (!isLoading()) {
          <span class="rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success tabular-data">
            {{ summary()?.documentsThisMonth ?? 0 }} este mes
          </span>
        }
      </header>

      @if (isLoading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-12 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (!summary()?.recentDocuments?.length) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          Aún no se han subido documentos.
        </p>
      } @else {
        <div class="space-y-4">
          @for (document of summary()!.recentDocuments; track document.id) {
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default px-4 py-3 text-sm text-muted">
              <div class="min-w-0">
                <p class="truncate font-semibold text-text">{{ document.filename }}</p>
                <p class="truncate text-xs text-subtle">{{ document.entityType }} • {{ document.uploadedBy }}</p>
              </div>
              <span class="flex-shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
                {{ document.createdAt | date: 'dd/MM' }}
              </span>
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class DashboardRecentDocumentsWidgetComponent {
  summary = input<DashboardSummary | null>(null);
  isLoading = input(false);
}
