import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NotificationPreferenceItem } from '../../../core/models/notification.model';
import { PushState } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-profile-notifications-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Notificaciones</h2>
      <p class="mt-1 text-sm text-subtle">
        Elige por qué canal quieres recibir cada tipo de aviso. Las notificaciones de seguridad no se pueden desactivar.
      </p>

      @if (pushState() !== 'unsupported') {
        <div class="mt-4 flex items-center justify-between gap-4 rounded-md border border-default bg-surface-muted px-4 py-3">
          <div>
            <p class="text-sm font-medium text-text">Notificaciones push en este dispositivo</p>
            <p class="text-xs text-subtle">
              @if (pushState() === 'denied') {
                Bloqueadas en el navegador. Actívalas desde la configuración del sitio.
              } @else if (pushState() === 'subscribed') {
                Activas en este dispositivo.
              } @else {
                Recibe avisos aunque LexAr esté cerrado.
              }
            </p>
          </div>
          @if (pushState() !== 'denied') {
            <button
              type="button"
              class="flex-shrink-0 rounded-md border border-default px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface disabled:opacity-60"
              [disabled]="isTogglingPush()"
              (click)="pushState() === 'subscribed' ? disablePush.emit() : enablePush.emit()"
            >
              {{ pushState() === 'subscribed' ? 'Desactivar' : 'Activar' }}
            </button>
          }
        </div>
      }

      @if (preferences().length === 0) {
        <p class="mt-4 text-sm text-subtle">Cargando preferencias...</p>
      } @else {
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[420px] text-sm">
            <thead>
              <tr class="border-b border-default text-left text-xs uppercase tracking-wide text-subtle">
                <th class="py-2 pr-2 font-medium">Notificación</th>
                <th class="w-16 py-2 text-center font-medium">In-app</th>
                <th class="w-16 py-2 text-center font-medium">Email</th>
                <th class="w-16 py-2 text-center font-medium">Push</th>
              </tr>
            </thead>
            <tbody>
              @for (pref of preferences(); track pref.type) {
                <tr class="border-b border-default last:border-b-0">
                  <td class="py-3 pr-2 text-text">{{ pref.description }}</td>
                  <td class="py-3 text-center">
                    @if (pref.availableChannels.includes('inApp')) {
                      <input
                        type="checkbox"
                        [checked]="pref.inAppEnabled"
                        (change)="toggle(pref, 'inAppEnabled', $event)"
                      />
                    } @else {
                      <span class="text-subtle">—</span>
                    }
                  </td>
                  <td class="py-3 text-center">
                    @if (pref.availableChannels.includes('email')) {
                      <input
                        type="checkbox"
                        [checked]="pref.emailEnabled"
                        (change)="toggle(pref, 'emailEnabled', $event)"
                      />
                    } @else {
                      <span class="text-subtle">—</span>
                    }
                  </td>
                  <td class="py-3 text-center">
                    @if (pref.availableChannels.includes('push')) {
                      <input
                        type="checkbox"
                        [checked]="pref.pushEnabled"
                        (change)="toggle(pref, 'pushEnabled', $event)"
                      />
                    } @else {
                      <span class="text-subtle">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <button
          type="button"
          class="mt-4 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-60"
          [disabled]="isSaving()"
          (click)="save.emit()"
        >
          {{ isSaving() ? 'Guardando...' : 'Guardar preferencias' }}
        </button>
      }
    </div>
  `,
})
export class ProfileNotificationsCardComponent {
  readonly preferences = input.required<NotificationPreferenceItem[]>();
  readonly isSaving = input(false);
  readonly pushState = input<PushState>('unsupported');
  readonly isTogglingPush = input(false);
  // Nombre distinto a "change" a propósito: el checkbox nativo dentro de esta
  // misma plantilla dispara su propio evento DOM `change`, que hace bubbling
  // hasta el host de este componente. Si el output se llamaba igual
  // (`change`), ese evento nativo pisaba el binding del padre
  // `(change)="notificationPreferences.set($event)"` — $event terminaba
  // siendo el Event nativo del checkbox en vez del array de preferencias,
  // rompiendo "Guardar preferencias" con un `TypeError: preferences.map is
  // not a function` silencioso (encontrado vía HU-FE-E2E-2, ver Bug 15 en
  // BACKLOG-BUGS.md).
  readonly preferencesChange = output<NotificationPreferenceItem[]>();
  readonly save = output<void>();
  readonly enablePush = output<void>();
  readonly disablePush = output<void>();

  toggle(
    pref: NotificationPreferenceItem,
    field: 'inAppEnabled' | 'emailEnabled' | 'pushEnabled',
    event: Event,
  ): void {
    const checked = (event.target as HTMLInputElement).checked;
    const updated = this.preferences().map((p) =>
      p.type === pref.type ? { ...p, [field]: checked } : p,
    );
    this.preferencesChange.emit(updated);
  }
}
