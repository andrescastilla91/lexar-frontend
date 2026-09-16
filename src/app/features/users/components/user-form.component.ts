import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * F35 rediseño 2026-09-15: este modal deja de ser el formulario de
 * alta+edición unificado (crecía sin límite cada vez que se pedía un dato
 * profesional nuevo). Ahora es SOLO el modal de alta — Nombre/Apellido/Email,
 * invitación por correo. El perfil profesional (asesor legal) y los roles y
 * permisos (solo lectura) viven en la ficha del usuario (`UserDetailComponent`,
 * /usuarios/:id), a la que se navega automáticamente tras crear.
 */
@Component({
  selector: 'app-user-form',
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
          (ngSubmit)="formSubmit.emit()"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text">Nuevo usuario</h3>
            <button
              type="button"
              (click)="formCancel.emit()"
              class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm text-muted">
                Nombre
                <input
                  formControlName="firstName"
                  type="text"
                  placeholder="Nombre"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                @if (form().get('firstName')?.touched && form().get('firstName')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Campo requerido</p>
                }
              </label>
              <label class="text-sm text-muted">
                Apellido
                <input
                  formControlName="lastName"
                  type="text"
                  placeholder="Apellido"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                @if (form().get('lastName')?.touched && form().get('lastName')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Campo requerido</p>
                }
              </label>
            </div>

            <label class="text-sm text-muted">
              Email
              <input
                formControlName="email"
                type="email"
                autocomplete="off"
                placeholder="usuario@empresa.com"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
              @if (form().get('email')?.touched && form().get('email')?.invalid) {
                <p class="mt-1 text-xs text-danger">Email inválido</p>
              }
            </label>

            <div class="rounded-md border border-default bg-surface-muted p-4">
              <p class="text-sm font-semibold text-text">Se enviará una invitación por correo</p>
              <p class="text-xs text-subtle mt-0.5">
                El usuario recibirá un enlace para crear su propia contraseña y activar su cuenta. Al crearlo
                entrarás directo a su ficha para completar el perfil profesional y asignar roles.
              </p>
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
              (click)="formCancel.emit()"
              class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
              [disabled]="isSubmitting() || form().invalid"
            >
              Enviar invitación
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class UserFormComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  formCancel = output<void>();
  formSubmit = output<void>();
}
