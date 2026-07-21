import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-billing-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Facturación</h2>
      <p class="mt-1 text-sm text-subtle">Correo donde llegarán tus comprobantes y facturas.</p>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <label class="block text-sm text-muted">
          Correo de facturación
          <input
            formControlName="billingEmail"
            type="email"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
          [disabled]="isSubmitting() || form().invalid"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsBillingFormComponent {
  form = input.required<FormGroup>();
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
}
