import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DashboardWidgetsService } from '../../../core/services/dashboard-widgets.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { DashboardWidgetCompanySetting } from '../../../core/models/dashboard-widgets.model';

/**
 * F32 PR3 — administración del catálogo de widgets a nivel empresa (capa
 * "empresa" del patrón de 3 capas, ver docs/05-features/F32-...md §1).
 * Mismo patrón que settings-notifications.component.ts (F12): lista con
 * toggle por fila, deshabilitado si `lockedByPlatform` (la plataforma ya lo
 * apagó y el admin del tenant no puede reactivarlo).
 */
@Component({
  selector: 'app-settings-dashboard-widgets',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p class="text-sm text-subtle">
        Elige qué widgets están disponibles para tu empresa. Un widget que desactives aquí desaparece del
        tablero de todos los usuarios; si lo reactivas, cada quien lo recupera en la posición en que lo tenía.
      </p>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (settings().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay widgets configurables.</p>
        </div>
      } @else {
        <div class="rounded-lg border border-default bg-surface shadow-card">
          <div class="divide-y divide-default">
            @for (setting of settings(); track setting.key) {
              <div class="flex items-center justify-between gap-4 px-6 py-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-text">{{ setting.title }}</p>
                  <p class="truncate text-xs text-subtle">{{ setting.description }}</p>
                </div>
                <button
                  *hasPermission="'dashboard.manage'"
                  type="button"
                  class="flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  [class]="
                    setting.enabled
                      ? 'border-success text-success hover:bg-success-tint'
                      : 'border-danger text-danger hover:bg-danger-tint'
                  "
                  [disabled]="setting.lockedByPlatform || savingKey() === setting.key"
                  [title]="setting.lockedByPlatform ? 'Desactivado a nivel de plataforma' : ''"
                  (click)="toggleWidget(setting.key, setting.enabled)"
                >
                  {{ setting.lockedByPlatform ? 'Bloqueado' : setting.enabled ? 'Activo' : 'Desactivado' }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SettingsDashboardWidgetsComponent implements OnInit {
  private readonly dashboardWidgetsService = inject(DashboardWidgetsService);
  private readonly toast = inject(ToastService);

  readonly settings = signal<DashboardWidgetCompanySetting[]>([]);
  readonly isLoading = signal(false);
  readonly savingKey = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.dashboardWidgetsService.getCompanySettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo cargar la configuración de widgets.');
        this.isLoading.set(false);
      },
    });
  }

  toggleWidget(widgetKey: string, currentlyEnabled: boolean): void {
    if (this.savingKey()) {
      return;
    }
    const nextEnabled = !currentlyEnabled;
    this.savingKey.set(widgetKey);

    this.dashboardWidgetsService.updateCompanySettings([{ widgetKey, enabled: nextEnabled }]).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.savingKey.set(null);
        this.toast.success('Configuración de widgets actualizada.');
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo actualizar la configuración.');
        this.savingKey.set(null);
      },
    });
  }
}
