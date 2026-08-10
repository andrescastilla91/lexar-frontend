import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-legal-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Datos legales</h2>
      <p class="mt-1 text-sm text-subtle">Información legal y de contacto de tu empresa.</p>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Razón social
            <input
              formControlName="legalName"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            NIT / RUT
            <input
              [value]="taxId()"
              type="text"
              disabled
              class="mt-2 w-full cursor-not-allowed rounded-md border border-default bg-surface-muted px-4 py-2.5 text-sm text-subtle shadow-card"
            />
          </label>
        </div>

        <label class="block text-sm text-muted">
          Dirección
          <input
            formControlName="address"
            type="text"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        <label class="block text-sm text-muted">
          Representante legal
          <input
            formControlName="legalRepresentative"
            type="text"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="text-sm text-muted">
            Ciudad
            <input
              formControlName="city"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            País (ISO-2)
            <input
              formControlName="country"
              type="text"
              maxlength="2"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm uppercase text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            Teléfono
            <input
              formControlName="phone"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Correo de contacto
            <input
              formControlName="email"
              type="email"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            Matrícula mercantil
            <input
              formControlName="registrationNumber"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
        </div>

        <label class="block text-sm text-muted">
          Régimen tributario
          <input
            formControlName="taxRegime"
            type="text"
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
          class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong sm:w-auto"
          [disabled]="isSubmitting() || form().invalid"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsLegalFormComponent {
  form = input.required<FormGroup>();
  taxId = input('');
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
}
