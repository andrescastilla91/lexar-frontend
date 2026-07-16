import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProcessStatus } from '../../../core/models/legal-process.model';
import { getStatusLabel } from '../utils/process-format.utils';

@Component({
  selector: 'app-process-status-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
          class="w-full max-w-md grid gap-4 rounded-lg border border-default bg-surface p-6 shadow-2xl"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <h3 class="text-lg font-semibold text-text">Cambiar estado del proceso</h3>
          <div class="grid gap-4">
            <label class="text-sm text-muted">
              Nuevo Estado *
              <select
                formControlName="status"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                @for (status of validNextStatuses(); track status) {
                  <option [value]="status">{{ getStatusLabel(status) }}</option>
                }
              </select>
              @if (validNextStatuses().length === 0) {
                <p class="mt-1 text-xs text-subtle">No hay transiciones de estado disponibles desde el estado actual.</p>
              } @else {
                <p class="mt-1 text-xs text-subtle">Estados disponibles según el flujo de trabajo</p>
              }
            </label>
            <label class="text-sm text-muted">
              Notas
              <textarea
                formControlName="notes"
                placeholder="Razón del cambio de estado (opcional)"
                rows="3"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              ></textarea>
            </label>
          </div>
          @if (errorMessage()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
          }
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
              [disabled]="isSubmitting()"
            >
              Actualizar estado
            </button>
            <button
              type="button"
              (click)="close.emit()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class ProcessStatusModalComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  validNextStatuses = input<ProcessStatus[]>([]);

  close = output<void>();
  submit = output<void>();

  protected readonly getStatusLabel = getStatusLabel;
}
