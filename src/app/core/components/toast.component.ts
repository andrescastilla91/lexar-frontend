import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-lg border px-4 py-3 shadow-raised"
          [class.border-success]="toast.type === 'success'"
          [class.bg-success-tint]="toast.type === 'success'"
          [class.border-danger]="toast.type === 'error'"
          [class.bg-danger-tint]="toast.type === 'error'"
        >
          @if (toast.type === 'success') {
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-success" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          } @else {
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
          <p class="flex-1 text-sm text-text">{{ toast.message }}</p>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="text-subtle transition hover:text-text"
            aria-label="Cerrar"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
