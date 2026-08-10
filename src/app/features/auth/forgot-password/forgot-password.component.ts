import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 shadow-raised backdrop-blur">
        <h1 class="text-2xl font-semibold text-text">¿Olvidaste tu contraseña?</h1>
        <p class="mt-2 text-sm text-subtle">
          Ingresa tu correo y te enviaremos instrucciones para restablecerla.
        </p>

        @if (submitted()) {
          <div class="mt-8 rounded-md border border-default bg-surface px-4 py-3 text-sm text-text">
            Si el correo existe en nuestro sistema, enviamos instrucciones para restablecer la contraseña. Revisa tu bandeja de entrada.
          </div>
        } @else {
          <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-muted" for="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="off"
                class="w-full rounded-md border border-default bg-surface px-4 py-3 text-base text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                placeholder="tucorreo@lexar.com"
              />
              @if (form.get('email')?.touched && form.get('email')?.invalid) {
                <p class="text-sm text-danger">Incluye un correo válido.</p>
              }
            </div>

            @if (errorMessage()) {
              <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                {{ errorMessage() }}
              </div>
            }

            <button
              type="submit"
              class="flex w-full items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-navy-900/40 disabled:cursor-not-allowed disabled:bg-strong"
              [disabled]="isSubmitting()"
            >
              <span>Enviar instrucciones</span>
              @if (isSubmitting()) {
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                </svg>
              }
            </button>
          </form>
        }

        <p class="mt-8 text-center text-sm text-subtle">
          <a routerLink="/login" class="font-semibold text-navy-900 hover:underline">Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email } = this.form.getRawValue();

    this.authService.forgotPassword(email).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (result.success) {
          this.submitted.set(true);
        } else {
          this.errorMessage.set(result.message ?? 'Ocurrió un error. Intenta de nuevo.');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Error al conectar con el servidor.');
      },
    });
  }
}
