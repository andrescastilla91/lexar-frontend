import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (dialog(); as current) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          class="w-full max-w-sm rounded-lg border bg-surface p-4 md:p-6 shadow-2xl"
          [class.border-danger]="current.danger"
          [class.border-default]="!current.danger"
        >
          <div class="mb-4 flex items-center gap-3">
            @if (current.danger) {
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-danger-tint">
                <svg class="h-5 w-5 text-danger" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            }
            <h3 class="text-lg font-semibold text-text">{{ current.title }}</h3>
          </div>

          <p class="mb-6 text-sm text-muted">{{ current.message }}</p>

          <div class="flex gap-3">
            <button
              type="button"
              (click)="respond(false)"
              class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              {{ current.cancelLabel ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              (click)="respond(true)"
              class="flex-1 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition"
              [class.bg-danger]="current.danger"
              [class.hover:opacity-80]="current.danger"
              [class.bg-navy-900]="!current.danger"
              [class.hover:bg-navy-950]="!current.danger"
            >
              {{ current.confirmLabel ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  readonly dialog = this.confirmDialogService.current;

  respond(value: boolean): void {
    this.confirmDialogService.respond(value);
  }
}
