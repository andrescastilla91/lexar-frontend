import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-lg border-l-4 bg-surface px-4 py-3 shadow-raised transition-colors"
          [class.border-success]="toast.type === 'success'"
          [class.border-danger]="toast.type === 'error'"
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
          <div class="flex-1">
            <p class="break-words text-sm text-text">{{ toast.message }}</p>
            @if (toast.action; as action) {
              <a
                [routerLink]="action.routerLink"
                [queryParams]="action.queryParams"
                (click)="toastService.dismiss(toast.id)"
                class="mt-1 inline-block text-sm font-semibold text-info hover:underline"
              >
                {{ action.label }}
              </a>
            }
          </div>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="flex-shrink-0 text-subtle transition hover:text-text"
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
