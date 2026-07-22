import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmation = group.get('confirmPassword')?.value;
    return password && confirmation && password !== confirmation
      ? { passwordsMismatch: true }
      : null;
  };
}

@Component({
  selector: 'app-activar-cuenta',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 shadow-raised backdrop-blur">
        <h1 class="text-2xl font-semibold text-text">Activa tu cuenta</h1>
        <p class="mt-2 text-sm text-subtle">Crea tu contraseña para empezar a usar LexAr.</p>

        @if (!token()) {
          <div class="mt-8 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            El enlace no incluye un token válido. Pide al administrador que reenvíe la invitación.
          </div>
        } @else if (success()) {
          <div class="mt-8 rounded-md border border-default bg-surface px-4 py-3 text-sm text-text">
            Tu cuenta fue activada. Estamos redirigiéndote a LexAr...
          </div>
        } @else {
          <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-muted" for="password">Contraseña</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                class="w-full rounded-md border border-default bg-surface px-4 py-3 text-base text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                placeholder="••••••••"
              />
              @if (form.get('password')?.touched && form.get('password')?.invalid) {
                <p class="text-sm text-danger">Debe tener al menos 8 caracteres.</p>
              }
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-muted" for="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
                class="w-full rounded-md border border-default bg-surface px-4 py-3 text-base text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                placeholder="••••••••"
              />
              @if (form.get('confirmPassword')?.touched && form.errors?.['passwordsMismatch']) {
                <p class="text-sm text-danger">Las contraseñas no coinciden.</p>
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
              <span>Activar mi cuenta</span>
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
export class ActivarCuentaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator() },
  );

  readonly token = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.token();
    if (!token) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { password } = this.form.getRawValue();

    this.authService.acceptInvitation(token, password).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (result.success) {
          this.success.set(true);
          setTimeout(() => this.router.navigateByUrl('/dashboard'), 1500);
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
