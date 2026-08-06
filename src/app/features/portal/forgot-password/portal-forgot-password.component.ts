import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

@Component({
  selector: 'app-portal-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 shadow-raised backdrop-blur">
        <p class="text-xs uppercase tracking-[0.3em] text-subtle">LexAr · Portal del cliente</p>
        <h1 class="mt-2 text-2xl font-semibold text-text">¿Olvidaste tu contraseña?</h1>
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
                placeholder="tucorreo@correo.com"
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
              Enviar instrucciones
            </button>
          </form>
        }

        <p class="mt-8 text-center text-sm text-subtle">
          <a routerLink="/portal/login" class="font-semibold text-navy-900 hover:underline">Volver a iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class PortalForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly portalAuthService = inject(PortalAuthService);

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

    this.portalAuthService.forgotPassword(email).subscribe({
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
