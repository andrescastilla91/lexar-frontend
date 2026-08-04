import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  PlatformNotificationChannel,
  PlatformNotificationChannelSetting,
  PlatformNotificationTypeSetting,
} from '../../../core/models/admin.model';

const CHANNEL_LABELS: Record<string, string> = {
  inApp: 'In-app',
  email: 'Email',
  push: 'Push',
};

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-semibold text-text">Notificaciones</h1>
        <p class="mt-1 text-sm text-subtle">
          Controla, a nivel de toda la plataforma, el nombre de cada evento y por qué canal se envía.
        </p>
      </div>

      <section class="rounded-lg border border-default bg-surface shadow-card">
        <div class="border-b border-default px-6 py-4">
          <h2 class="text-base font-semibold text-text">Canales (interruptor de emergencia)</h2>
          <p class="mt-1 text-sm text-subtle">
            Apaga un canal completo si el proveedor tiene una falla, para evitar log de errores mientras se resuelve. Esto pisa cualquier configuración por evento.
          </p>
        </div>
        @if (isLoadingChannels()) {
          <div class="flex items-center justify-center py-8">
            <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
          </div>
        } @else {
          <div class="divide-y divide-default">
            @for (channel of channels(); track channel.channel) {
              <div class="flex items-center justify-between px-6 py-3">
                <span class="text-sm font-medium text-text">{{ channelLabel(channel.channel) }}</span>
                <button
                  type="button"
                  class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
                  [class]="channel.enabled ? 'border-success text-success hover:bg-success-tint' : 'border-danger text-danger hover:bg-danger-tint'"
                  [disabled]="isSavingChannel() === channel.channel"
                  (click)="toggleChannel(channel)"
                >
                  {{ channel.enabled ? 'Activo' : 'Desactivado' }}
                </button>
              </div>
            }
          </div>
        }
      </section>

      <section class="rounded-lg border border-default bg-surface shadow-card">
        <div class="border-b border-default px-6 py-4">
          <h2 class="text-base font-semibold text-text">Eventos de notificación</h2>
          <p class="mt-1 text-sm text-subtle">
            Solo se listan los eventos configurables. Los de seguridad o continuidad de negocio nunca se pueden apagar desde aquí. Puedes renombrar cada evento y habilitar o deshabilitar cualquier canal, aunque el código no lo traiga por defecto.
          </p>
        </div>
        @if (isLoadingTypes()) {
          <div class="flex items-center justify-center py-8">
            <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
          </div>
        } @else {
          <div class="divide-y divide-default">
            @for (type of types(); track type.type) {
              <div class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0 flex-1">
                  @if (editingType() === type.type) {
                    <div class="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        [(ngModel)]="draftLabel"
                        maxlength="150"
                        class="w-full max-w-xs rounded-md border border-default px-3 py-1.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                        [placeholder]="type.description"
                      />
                      <button
                        type="button"
                        class="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:opacity-60"
                        [disabled]="isSavingLabel()"
                        (click)="saveLabel(type)"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        class="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted"
                        [disabled]="isSavingLabel()"
                        (click)="cancelEditLabel()"
                      >
                        Cancelar
                      </button>
                    </div>
                  } @else {
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-medium text-text">{{ type.label || type.description }}</p>
                      @if (type.label) {
                        <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                          Renombrado
                        </span>
                      }
                      <button
                        type="button"
                        class="text-xs font-medium text-muted underline-offset-2 hover:underline"
                        (click)="startEditLabel(type)"
                      >
                        Renombrar
                      </button>
                    </div>
                  }
                  <p class="mt-0.5 font-mono text-xs text-subtle">{{ type.type }}</p>

                  <div class="mt-2 flex flex-wrap gap-2">
                    @for (channel of type.channels; track channel.channel) {
                      <button
                        type="button"
                        class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
                        [class]="channel.enabled ? 'border-success text-success hover:bg-success-tint' : 'border-default text-subtle hover:bg-surface-muted'"
                        [disabled]="isSavingTypeChannel() === (type.type + ':' + channel.channel)"
                        (click)="toggleTypeChannel(type, channel.channel)"
                      >
                        {{ channelLabel(channel.channel) }}
                        {{ channel.enabled ? '· activo' : '· inactivo' }}
                        @if (channel.enabled !== channel.isDefault) {
                          <span class="ml-1 text-[10px] uppercase tracking-wide">(personalizado)</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <button
                  type="button"
                  class="flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                  [class]="type.enabled ? 'border-success text-success hover:bg-success-tint' : 'border-danger text-danger hover:bg-danger-tint'"
                  [disabled]="isSavingType() === type.type"
                  (click)="toggleType(type)"
                  title="Interruptor maestro: si se apaga, ningún canal se envía para este evento."
                >
                  Evento {{ type.enabled ? 'activo' : 'desactivado' }}
                </button>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class AdminNotificationsComponent implements OnInit {
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly toast = inject(ToastService);

  readonly types = signal<PlatformNotificationTypeSetting[]>([]);
  readonly channels = signal<PlatformNotificationChannelSetting[]>([]);
  readonly isLoadingTypes = signal(false);
  readonly isLoadingChannels = signal(false);
  readonly isSavingType = signal<string | null>(null);
  readonly isSavingChannel = signal<string | null>(null);
  readonly isSavingTypeChannel = signal<string | null>(null);
  readonly isSavingLabel = signal(false);

  readonly editingType = signal<string | null>(null);
  draftLabel = '';

  ngOnInit(): void {
    this.loadTypes();
    this.loadChannels();
  }

  channelLabel(channel: string): string {
    return CHANNEL_LABELS[channel] ?? channel;
  }

  private loadTypes(): void {
    this.isLoadingTypes.set(true);
    this.platformAdminService.getNotificationTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        this.isLoadingTypes.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudieron cargar los tipos de notificación.');
        this.isLoadingTypes.set(false);
      },
    });
  }

  private loadChannels(): void {
    this.isLoadingChannels.set(true);
    this.platformAdminService.getNotificationChannels().subscribe({
      next: (channels) => {
        this.channels.set(channels);
        this.isLoadingChannels.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudieron cargar los canales de notificación.');
        this.isLoadingChannels.set(false);
      },
    });
  }

  startEditLabel(type: PlatformNotificationTypeSetting): void {
    this.editingType.set(type.type);
    this.draftLabel = type.label ?? type.description;
  }

  cancelEditLabel(): void {
    this.editingType.set(null);
    this.draftLabel = '';
  }

  saveLabel(type: PlatformNotificationTypeSetting): void {
    if (this.isSavingLabel()) {
      return;
    }
    const trimmed = this.draftLabel.trim();
    const nextLabel = trimmed === type.description ? null : trimmed || null;

    this.isSavingLabel.set(true);
    this.platformAdminService.updateNotificationType(type.type, { label: nextLabel }).subscribe({
      next: () => {
        this.types.update((items) =>
          items.map((t) => (t.type === type.type ? { ...t, label: nextLabel } : t)),
        );
        this.isSavingLabel.set(false);
        this.editingType.set(null);
        this.toast.success('Nombre actualizado.');
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo renombrar el evento.');
        this.isSavingLabel.set(false);
      },
    });
  }

  toggleType(type: PlatformNotificationTypeSetting): void {
    if (this.isSavingType()) {
      return;
    }
    const nextEnabled = !type.enabled;
    this.isSavingType.set(type.type);
    this.platformAdminService.updateNotificationType(type.type, { enabled: nextEnabled }).subscribe({
      next: () => {
        this.types.update((items) =>
          items.map((t) => (t.type === type.type ? { ...t, enabled: nextEnabled } : t)),
        );
        this.isSavingType.set(null);
        this.toast.success(nextEnabled ? 'Evento activado.' : 'Evento desactivado.');
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo actualizar el evento.');
        this.isSavingType.set(null);
      },
    });
  }

  toggleTypeChannel(type: PlatformNotificationTypeSetting, channel: PlatformNotificationChannel): void {
    if (this.isSavingTypeChannel()) {
      return;
    }
    const current = type.channels.find((c) => c.channel === channel);
    const nextEnabled = !(current?.enabled ?? false);
    const key = `${type.type}:${channel}`;

    this.isSavingTypeChannel.set(key);
    this.platformAdminService.updateNotificationTypeChannel(type.type, channel, nextEnabled).subscribe({
      next: () => {
        this.types.update((items) =>
          items.map((t) =>
            t.type === type.type
              ? {
                  ...t,
                  channels: t.channels.map((c) =>
                    c.channel === channel ? { ...c, enabled: nextEnabled } : c,
                  ),
                }
              : t,
          ),
        );
        this.isSavingTypeChannel.set(null);
        this.toast.success(nextEnabled ? 'Canal habilitado para este evento.' : 'Canal deshabilitado para este evento.');
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo actualizar el canal de este evento.');
        this.isSavingTypeChannel.set(null);
      },
    });
  }

  toggleChannel(channel: PlatformNotificationChannelSetting): void {
    if (this.isSavingChannel()) {
      return;
    }
    const nextEnabled = !channel.enabled;
    this.isSavingChannel.set(channel.channel);
    this.platformAdminService.updateNotificationChannel(channel.channel, nextEnabled).subscribe({
      next: () => {
        this.channels.update((items) =>
          items.map((c) => (c.channel === channel.channel ? { ...c, enabled: nextEnabled } : c)),
        );
        this.isSavingChannel.set(null);
        this.toast.success(nextEnabled ? 'Canal activado.' : 'Canal desactivado.');
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo actualizar el canal.');
        this.isSavingChannel.set(null);
      },
    });
  }
}
