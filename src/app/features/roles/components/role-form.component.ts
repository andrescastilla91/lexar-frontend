import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <form
          class="w-full max-w-sm md:max-w-lg overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
          style="max-height: 90vh"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text">
              {{ isEditing() ? 'Editar rol' : 'Nuevo rol' }}
            </h3>
            <button
              type="button"
              (click)="cancel.emit()"
              class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="grid gap-4">
            <label class="text-sm text-muted">
              Nombre del rol
              <input
                formControlName="name"
                type="text"
                placeholder="Ej: Coordinador Legal"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
              @if (form().get('name')?.touched && form().get('name')?.invalid) {
                <p class="mt-1 text-xs text-danger">Campo requerido</p>
              }
            </label>

            <label class="text-sm text-muted">
              Descripción (opcional)
              <textarea
                formControlName="description"
                rows="3"
                placeholder="Describe las responsabilidades de este rol"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              ></textarea>
            </label>
          </div>

          @if (errorMessage()) {
            <div class="mt-4 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              {{ errorMessage() }}
            </div>
          }

          <div class="mt-6 flex gap-3">
            <button
              type="button"
              (click)="cancel.emit()"
              class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
              [disabled]="isSubmitting() || form().invalid"
            >
              {{ isEditing() ? 'Actualizar' : 'Crear rol' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class RoleFormComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isEditing = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  cancel = output<void>();
  submit = output<void>();
}
