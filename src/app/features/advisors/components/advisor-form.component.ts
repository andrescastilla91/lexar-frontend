import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdvisorStatus } from '../../../core/models/advisor-backend.model';
import { UserBackend } from '../../../core/models/user-backend.model';

@Component({
  selector: 'app-advisor-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <form
          class="w-full max-w-xl md:max-w-2xl overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
          style="max-height: 90vh"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text">
              {{ isEditing() ? 'Editar asesor' : 'Registrar nuevo asesor' }}
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
              Usuario *
              <select
                formControlName="userId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
              >
                <option value="">Selecciona un usuario</option>
                @for (user of availableUsers(); track user.id) {
                  <option [value]="user.id">{{ user.firstName }} {{ user.lastName }} ({{ user.email }})</option>
                }
              </select>
              @if (form().get('userId')?.touched && form().get('userId')?.invalid) {
                <p class="mt-1 text-xs text-danger">Campo requerido</p>
              }
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm text-muted">
                Teléfono
                <input
                  formControlName="phone"
                  type="text"
                  placeholder="+57 300 000 0000"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Especialidad *
                <input
                  formControlName="specialty"
                  type="text"
                  placeholder="Derecho administrativo, penal, etc."
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                @if (form().get('specialty')?.touched && form().get('specialty')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Campo requerido</p>
                }
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <label class="text-sm text-muted">
                Estado
                <select
                  formControlName="status"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  <option [value]="AdvisorStatus.AVAILABLE">Disponible</option>
                  <option [value]="AdvisorStatus.IN_HEARING">En audiencia</option>
                  <option [value]="AdvisorStatus.IN_MEETING">En reunión</option>
                  <option [value]="AdvisorStatus.BUSY">Ocupado</option>
                </select>
              </label>
              <label class="text-sm text-muted">
                Años de experiencia
                <input
                  formControlName="experienceYears"
                  type="number"
                  min="0"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Calificación
                <input
                  formControlName="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            </div>
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
              {{ isEditing() ? 'Actualizar' : 'Crear asesor' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class AdvisorFormComponent {
  protected readonly AdvisorStatus = AdvisorStatus;

  form = input.required<FormGroup>();
  isOpen = input(false);
  isEditing = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  availableUsers = input<UserBackend[]>([]);

  cancel = output<void>();
  submit = output<void>();
}
