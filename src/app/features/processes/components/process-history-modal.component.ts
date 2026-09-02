import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProcessEvent, ProcessEventType } from '../../../core/models/process-event.model';
import { formatBytes, formatDate, getEventColor, getEventIcon, getEventLabel } from '../utils/process-format.utils';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import {
  PortalEventVisibilityMode,
  PortalEventVisibilityPolicy,
} from '../../../core/models/portal-visibility-policy.model';

export interface HistoryVisibilityToggle {
  eventId: string;
  visibleToClient: boolean;
}

export interface HistoryFileRef {
  fileId: string;
  filename: string;
}

@Component({
  selector: 'app-process-history-modal',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          class="w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col rounded-lg border border-default bg-surface shadow-2xl overflow-hidden max-h-[85vh]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default p-6">
            <div>
              <h3 class="text-lg font-semibold text-text">Historial del proceso</h3>
              <p class="text-sm text-subtle">{{ processTitle() }}</p>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="rounded-md p-2 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Timeline Content -->
          <div class="flex-1 overflow-y-auto p-6">
            @if (isLoadingHistory()) {
              <div class="flex items-center justify-center py-12">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
              </div>
            } @else if (events().length === 0) {
              <div class="py-12 text-center">
                <p class="text-sm text-subtle">No hay eventos registrados para este proceso</p>
              </div>
            } @else {
              <div class="space-y-4">
                @for (event of events(); track event.id) {
                  <div class="flex gap-4">
                    <!-- Timeline line -->
                    <div class="flex flex-col items-center">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full {{ getEventColor(event.type) }}">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path [attr.d]="getEventIcon(event.type)" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </div>
                      @if (!$last) {
                        <div class="h-full w-0.5 bg-default"></div>
                      }
                    </div>

                    <!-- Event content -->
                    <div class="flex-1 pb-8">
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-muted {{ getEventColor(event.type) }} px-2 py-0.5 rounded-full">
                              {{ getEventLabel(event.type) }}
                            </span>
                            <span class="text-xs text-subtle">{{ formatDate(event.createdAt) }}</span>
                            @if (isAlwaysVisible(event.type)) {
                              <span class="text-xs font-medium text-success">Siempre visible para el cliente</span>
                            } @else {
                              <button
                                *hasPermission="['legal_processes.edit']"
                                type="button"
                                (click)="toggleVisibility.emit({ eventId: event.id, visibleToClient: !event.visibleToClient })"
                                class="rounded-full p-1 transition"
                                [class.text-success]="event.visibleToClient"
                                [class.hover:bg-success-tint]="event.visibleToClient"
                                [class.text-subtle]="!event.visibleToClient"
                                [class.hover:bg-surface-muted]="!event.visibleToClient"
                                [title]="event.visibleToClient ? 'Visible para el cliente en el portal' : 'No visible para el cliente'"
                              >
                                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                              </button>
                              @if (event.visibleToClient) {
                                <span class="text-xs font-medium text-success">Visible para el cliente</span>
                              }
                            }
                          </div>
                          <p class="mt-1 text-sm text-text">{{ event.description }}</p>

                          <!-- Archivos adjuntos -->
                          @if (event.attachments && event.attachments.length > 0) {
                            <div class="mt-3">
                              <p class="text-xs font-medium text-muted mb-2">Archivos adjuntos:</p>
                              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                @for (attachment of event.attachments; track attachment.url) {
                                  <div class="flex items-center justify-between rounded-lg border border-default bg-surface-muted p-2 hover:bg-surface-muted transition">
                                    <div class="flex items-center gap-2 flex-1 min-w-0">
                                      <svg class="h-4 w-4 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                      </svg>
                                      <div class="flex-1 min-w-0">
                                        <p class="text-xs font-medium text-text truncate">{{ attachment.filename }}</p>
                                        <p class="text-xs text-subtle">{{ formatBytes(attachment.size) }}</p>
                                      </div>
                                    </div>
                                    <div class="flex gap-1 flex-shrink-0">
                                      <button
                                        type="button"
                                        (click)="previewFile.emit({ fileId: attachment.url, filename: attachment.filename })"
                                        class="rounded-lg p-1.5 text-primary hover:bg-info-tint transition"
                                        title="Ver archivo"
                                      >
                                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        (click)="downloadFile.emit(attachment.url)"
                                        class="rounded-lg p-1.5 text-success hover:bg-success-tint transition"
                                        title="Descargar archivo"
                                      >
                                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                          }

                          <div class="mt-1 flex items-center gap-2 text-xs text-subtle">
                            <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                            <span>{{ event.user.firstName }} {{ event.user.lastName }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="border-t border-default p-4">
            <button
              type="button"
              (click)="close.emit()"
              class="w-full rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProcessHistoryModalComponent {
  isOpen = input(false);
  processTitle = input<string | null>(null);
  isLoadingHistory = input(false);
  events = input<ProcessEvent[]>([]);
  // F27: política de visibilidad por tipo de evento — determina si el
  // toggle manual se oculta a favor del badge "Siempre visible".
  visibilityPolicies = input<PortalEventVisibilityPolicy[]>([]);

  close = output<void>();
  previewFile = output<HistoryFileRef>();
  downloadFile = output<string>();
  toggleVisibility = output<HistoryVisibilityToggle>();

  protected readonly eventTypes = ProcessEventType;
  protected readonly formatDate = formatDate;
  protected readonly formatBytes = formatBytes;
  protected readonly getEventIcon = getEventIcon;
  protected readonly getEventColor = getEventColor;
  protected readonly getEventLabel = getEventLabel;

  private readonly alwaysVisibleTypes = computed(
    () =>
      new Set(
        this.visibilityPolicies()
          .filter((p) => p.mode === PortalEventVisibilityMode.ALWAYS)
          .map((p) => p.eventType)
      )
  );

  isAlwaysVisible(type: ProcessEventType): boolean {
    return this.alwaysVisibleTypes().has(type);
  }
}
