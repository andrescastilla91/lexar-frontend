import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-security-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Seguridad</h2>
      <p class="mt-1 text-sm text-subtle">
        Controla las políticas de acceso que aplican a todos los usuarios de tu empresa.
      </p>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <label class="flex items-start gap-3 text-sm text-muted">
          <input
            formControlName="require2fa"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-default text-navy-900 focus:ring-navy-900/30"
          />
          <span>
            <span class="font-medium text-text">Exigir verificación en dos pasos</span>
            <br />
            Todo usuario sin 2FA activo quedará bloqueado hasta que lo configure en su perfil.
          </span>
        </label>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong sm:w-auto"
          [disabled]="isSubmitting()"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsSecurityFormComponent {
  form = input.required<FormGroup>();
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
}
