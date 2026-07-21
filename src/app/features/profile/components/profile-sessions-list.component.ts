import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SessionInfo } from '../../../core/models/profile.model';

@Component({
  selector: 'app-profile-sessions-list',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Sesiones activas</h2>
      <p class="mt-1 text-sm text-subtle">Dispositivos donde tu cuenta tiene una sesión iniciada.</p>

      <div class="mt-4 divide-y divide-default">
        @if (isLoading()) {
          <p class="py-4 text-sm text-subtle">Cargando sesiones...</p>
        } @else if (sessions().length === 0) {
          <p class="py-4 text-sm text-subtle">No hay sesiones activas.</p>
        } @else {
          @for (session of sessions(); track session.id) {
            <div class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ session.userAgent || 'Dispositivo desconocido' }}
                  @if (session.current) {
                    <span class="ml-2 rounded-full bg-success-tint px-2 py-0.5 text-xs font-semibold text-success">Actual</span>
                  }
                </p>
                <p class="text-xs text-subtle">
                  {{ session.ip || 'IP desconocida' }} · desde {{ session.createdAt | date: 'short' }}
                </p>
              </div>
              @if (!session.current) {
                <button
                  type="button"
                  (click)="revoke.emit(session.id)"
                  class="flex-shrink-0 rounded-md border border-danger px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-tint"
                >
                  Cerrar sesión
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ProfileSessionsListComponent {
  sessions = input<SessionInfo[]>([]);
  isLoading = input(false);

  revoke = output<string>();
}
