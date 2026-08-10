import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

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
            <h3 class="text-lg font-semibold text-text">
              {{ isEditing() ? 'Editar usuario' : 'Nuevo usuario' }}
            </h3>
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
                [disabled]="editingUserHasLoggedIn()"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle disabled:cursor-not-allowed"
              />
              @if (form().get('email')?.touched && form().get('email')?.invalid) {
                <p class="mt-1 text-xs text-danger">Email inválido</p>
              }
              @if (isEditing() && editingUserHasLoggedIn()) {
                <p class="mt-1 text-xs text-subtle">
                  <svg class="inline h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  El email no puede modificarse porque el usuario ya inició sesión (es su identificador de acceso)
                </p>
              } @else if (isEditing() && !editingUserHasLoggedIn()) {
                <p class="mt-1 text-xs text-success">
                  <svg class="inline h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  El email puede modificarse porque el usuario aún no ha iniciado sesión
                </p>
              }
            </label>

            @if (!isEditing()) {
              <div class="rounded-md border border-default bg-surface-muted p-4">
                <p class="text-sm font-semibold text-text">Se enviará una invitación por correo</p>
                <p class="text-xs text-subtle mt-0.5">
                  El usuario recibirá un enlace para crear su propia contraseña y activar su cuenta.
                </p>
              </div>
            }
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
              {{ isEditing() ? 'Actualizar' : 'Enviar invitación' }}
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
  isEditing = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  editingUserHasLoggedIn = input(false);

  formCancel = output<void>();
  formSubmit = output<void>();
}
