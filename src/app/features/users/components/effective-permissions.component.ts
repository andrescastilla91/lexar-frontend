import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { UsersService } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { EffectivePermissionsResponse } from '../../../core/models/user-backend.model';
import { downloadBlob, todayStamp } from '../../../core/utils/blob-download.util';

/**
 * F39 (ROL-07): permisos efectivos de un usuario — la unión de lo que le dan
 * todos sus roles, agrupada por dominio, indicando de qué rol viene cada
 * permiso. Solo lectura, con exportación a CSV. El padre solo lo monta si el
 * usuario actual tiene `users.view` y `roles.view`.
 */
@Component({
  selector: 'app-effective-permissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">
          @if (data(); as result) {
            {{ result.total }} {{ result.total === 1 ? 'permiso efectivo' : 'permisos efectivos' }}
            · {{ result.roles.length }} {{ result.roles.length === 1 ? 'rol' : 'roles' }}
          } @else {
            Unión de los permisos de todos los roles del usuario.
          }
        </p>
        <button
          type="button"
          (click)="exportCsv()"
          [disabled]="exporting() || !data() || data()!.total === 0"
          class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted disabled:opacity-50"
        >
          {{ exporting() ? 'Exportando…' : 'Exportar CSV' }}
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (errorMessage()) {
        <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
          {{ errorMessage() }}
        </div>
      } @else if (data(); as result) {
        @if (result.total === 0) {
          <div class="rounded-lg border border-default bg-surface p-12 text-center">
            <p class="text-subtle">
              {{ result.roles.length === 0 ? 'Este usuario no tiene roles asignados.' : 'Los roles de este usuario no otorgan permisos.' }}
            </p>
          </div>
        } @else {
          <div class="grid gap-4 md:grid-cols-2">
            @for (group of result.groups; track group.groupCode) {
              <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
                <p class="text-xs font-semibold uppercase tracking-wide text-subtle">{{ group.groupLabel }}</p>
                <ul class="mt-3 space-y-2">
                  @for (permission of group.permissions; track permission.code) {
                    <li>
                      <p class="text-sm font-medium text-text">{{ permission.label }}</p>
                      <p class="text-xs text-subtle">Origen: {{ originLabel(permission.sources) }}</p>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class EffectivePermissionsComponent {
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);

  userId = input.required<string>();
  /** Cambia cuando se reasignan roles, para recalcular la unión. */
  refreshKey = input<unknown>(null);

  readonly data = signal<EffectivePermissionsResponse | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.userId();
      this.refreshKey();
      this.load(id);
    });
  }

  originLabel(sources: { roleName: string }[]): string {
    return sources.map((source) => source.roleName).join(', ');
  }

  exportCsv(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.usersService.exportEffectivePermissions(this.userId()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `permisos-efectivos-${todayStamp()}.csv`);
      },
      error: (error: Error) => {
        this.exporting.set(false);
        this.toast.error(error.message || 'No se pudo exportar los permisos efectivos');
      },
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usersService.getEffectivePermissions(id).subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: (error: { message?: string }) => {
        this.data.set(null);
        this.errorMessage.set(error.message || 'No se pudieron cargar los permisos efectivos');
        this.loading.set(false);
      },
    });
  }
}
