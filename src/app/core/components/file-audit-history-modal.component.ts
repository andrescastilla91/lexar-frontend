import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FileAuditLogEntry } from '../models/file.model';

export interface FileAuditHistoryInfo {
  originalFilename: string;
}

@Component({
  selector: 'app-file-audit-history-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (file()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        (click)="close.emit()"
      >
        <div
          class="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-surface"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-default px-6 py-4">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-text">Historial de auditoría</h3>
              <p class="truncate text-xs text-subtle">{{ file()!.originalFilename }}</p>
            </div>
            <button (click)="close.emit()" class="rounded-lg p-2 text-subtle hover:bg-surface-muted" title="Cerrar">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-auto p-6">
            @if (loading()) {
              <div class="flex justify-center py-8">
                <svg class="h-6 w-6 animate-spin text-subtle" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                </svg>
              </div>
            } @else if (entries().length === 0) {
              <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
                Sin actividad registrada todavía.
              </p>
            } @else {
              <ul class="space-y-2">
                @for (entry of entries(); track entry.id) {
                  <li class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm">
                    <div class="min-w-0">
                      <p class="font-medium text-text">
                        {{ entry.actionLabel }}
                        @if (entry.source === 'portal') {
                          <span class="ml-1 rounded bg-primary-tint px-1.5 py-0.5 text-xs font-normal text-primary">Portal del cliente</span>
                        }
                      </p>
                      <p class="truncate text-xs text-subtle">{{ entry.userEmail ?? 'Usuario desconocido' }}</p>
                    </div>
                    <span class="shrink-0 text-xs text-subtle">{{ formatDateTime(entry.createdAt) }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class FileAuditHistoryModalComponent {
  file = input<FileAuditHistoryInfo | null>(null);
  entries = input<FileAuditLogEntry[]>([]);
  loading = input(false);

  close = output<void>();

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
