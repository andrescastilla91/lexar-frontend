import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { CompanyNotificationSetting } from '../../../core/models/notification.model';

const CHANNEL_LABELS: Record<string, string> = {
  inApp: 'In-app',
  email: 'Email',
  push: 'Push',
};

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p class="text-sm text-subtle">
        Define por qué canal se notifica cada evento en tu empresa. Un canal bloqueado por plataforma no se puede reactivar aquí.
      </p>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (settings().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay tipos de notificación configurables.</p>
        </div>
      } @else {
        <div class="rounded-lg border border-default bg-surface shadow-card">
          <div class="divide-y divide-default">
            @for (setting of settings(); track setting.type) {
              <div class="px-6 py-4">
                <p class="text-sm font-medium text-text">{{ setting.description }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (channel of setting.channels; track channel.channel) {
                    <button
                      *hasPermission="'notifications.manage'"
                      type="button"
                      class="rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                      [class]="channel.enabled ? 'border-success text-success hover:bg-success-tint' : 'border-danger text-danger hover:bg-danger-tint'"
                      [disabled]="channel.lockedByPlatform || savingKey() === setting.type + ':' + channel.channel"
                      [title]="channel.lockedByPlatform ? 'Desactivado a nivel de plataforma' : ''"
                      (click)="toggleChannel(setting.type, channel.channel, channel.enabled)"
                    >
                      {{ channelLabel(channel.channel) }} · {{ channel.lockedByPlatform ? 'Bloqueado' : (channel.enabled ? 'Activo' : 'Desactivado') }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SettingsNotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly toast = inject(ToastService);

  readonly settings = signal<CompanyNotificationSetting[]>([]);
  readonly isLoading = signal(false);
  readonly savingKey = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSettings();
  }

  channelLabel(channel: string): string {
    return CHANNEL_LABELS[channel] ?? channel;
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.notificationsService.getCompanySettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.error?.message || 'No se pudo cargar la configuración de notificaciones.');
        this.isLoading.set(false);
      },
    });
  }

  toggleChannel(type: string, channel: string, currentlyEnabled: boolean): void {
    const key = `${type}:${channel}`;
    if (this.savingKey()) {
      return;
    }
    const nextEnabled = !currentlyEnabled;
    this.savingKey.set(key);

    this.notificationsService.updateCompanySettings([{ type, channel, enabled: nextEnabled }]).subscribe({
      next: () => {
        this.settings.update((items) =>
          items.map((setting) =>
            setting.type === type
              ? {
                  ...setting,
                  channels: setting.channels.map((c) =>
                    c.channel === channel ? { ...c, enabled: nextEnabled } : c,
                  ),
                }
              : setting,
          ),
        );
        this.savingKey.set(null);
        this.toast.success('Configuración de notificaciones actualizada.');
      },
      error: (error) => {
        this.toast.error(error.error?.message || 'No se pudo actualizar la configuración.');
        this.savingKey.set(null);
      },
    });
  }
}
