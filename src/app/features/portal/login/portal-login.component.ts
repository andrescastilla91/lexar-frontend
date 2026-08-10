import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-muted via-surface to-surface-sunken px-6">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 shadow-raised backdrop-blur">
        <p class="text-xs uppercase tracking-[0.3em] text-subtle">LexAr · Portal del cliente</p>
        <h1 class="mt-2 text-2xl font-semibold text-text">Ingresa a tu portal</h1>
        <p class="mt-2 text-sm text-subtle">Consulta el estado de tu proceso y los documentos compartidos contigo.</p>

        <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-muted" for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              class="w-full rounded-md border border-default bg-surface px-4 py-3 text-base text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              placeholder="tucorreo@correo.com"
            />
            @if (form.get('email')?.touched && form.get('email')?.invalid) {
              <p class="text-sm text-danger">Incluye un correo válido.</p>
            }
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-muted" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              class="w-full rounded-md border border-default bg-surface px-4 py-3 text-base text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              placeholder="••••••••"
            />
            @if (form.get('password')?.touched && form.get('password')?.invalid) {
              <p class="text-sm text-danger">La contraseña es obligatoria.</p>
            }
          </div>

          <div class="flex justify-end">
            <a routerLink="/portal/recuperar" class="text-sm font-medium text-navy-900 hover:underline">¿Olvidaste tu contraseña?</a>
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
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  `,
})
export class PortalLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly portalAuthService = inject(PortalAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    if (this.portalAuthService.isAuthenticated()) {
      this.router.navigate(['/portal/procesos']);
    }
  }

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

    const { email, password } = this.form.getRawValue();

    this.portalAuthService.login(email, password).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (!result.success) {
          this.errorMessage.set(result.message ?? 'Ocurrió un error al iniciar sesión.');
          return;
        }

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = '/portal/procesos';
        this.router.navigateByUrl(returnUrl && returnUrl !== '/portal/login' ? returnUrl : fallback);
      },
      error: (error) => {
        this.errorMessage.set(error.message ?? 'Error al conectar con el servidor.');
        this.isSubmitting.set(false);
      },
    });
  }
}
