import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200">
      <div class="flex min-h-screen flex-col lg:flex-row">
        <section class="flex flex-1 flex-col justify-between bg-[#192033] p-8 text-white">
          <div>
            <p class="text-sm uppercase tracking-[0.3em] text-slate-300">LexAr Suite</p>
            <h1 class="mt-4 text-3xl font-semibold lg:text-4xl">Gestión Jurídica Inteligente</h1>
            <p class="mt-4 max-w-sm text-sm text-slate-300">
              Orquesta tus equipos legales, centraliza evidencia y anticipa riesgos con analítica en tiempo real.
            </p>
          </div>
          <div class="mt-12 grid gap-4 text-sm text-slate-200">
            <div class="rounded-2xl bg-white/10 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-300">KPIs 2024</p>
              <p class="mt-2 text-lg font-semibold">+37% procesos resueltos en etapa temprana</p>
            </div>
            <div class="rounded-2xl bg-white/10 p-4">
              <p class="text-xs uppercase tracking-wide text-slate-300">Confianza</p>
              <p class="mt-2 text-lg font-semibold">Cifrado, trazabilidad y flujos auditables en 100% de casos</p>
            </div>
          </div>
        </section>

        <section class="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur">
            <h2 class="text-2xl font-semibold text-slate-800">Bienvenido de nuevo</h2>
            <p class="mt-2 text-sm text-slate-500">Ingresa tu correo corporativo para continuar.</p>

            <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-600" for="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  placeholder="tucorreo@lexar.com"
                />
                @if (form.get('email')?.touched && form.get('email')?.invalid) {
                  <p class="text-sm text-rose-500">Incluye un correo corporativo válido.</p>
                }
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-600" for="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  autocomplete="current-password"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  placeholder="••••••••"
                />
                @if (form.get('password')?.touched && form.get('password')?.invalid) {
                  <p class="text-sm text-rose-500">La contraseña es obligatoria.</p>
                }
              </div>

              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" formControlName="remember" class="h-4 w-4 rounded border-slate-300 text-[#192033]" />
                  Recordar sesión
                </label>
                <a href="#" class="text-sm font-medium text-[#192033] hover:underline">¿Olvidaste tu contraseña?</a>
              </div>

              @if (errorMessage()) {
                <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {{ errorMessage() }}
                </div>
              }

              <button
                type="submit"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#192033] px-4 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-[#192033]/40 disabled:cursor-not-allowed disabled:bg-slate-400"
                [disabled]="isSubmitting()"
              >
                <span>Iniciar sesión</span>
                @if (isSubmitting()) {
                  <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                  </svg>
                }
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-slate-500">
              ¿Aún no tienes acceso? <a routerLink="/registro" class="font-semibold text-[#192033] hover:underline">Crear cuenta</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly formInvalid = computed(() => this.form.invalid);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const result = this.authService.login(email, password);

    if (!result.success) {
      this.errorMessage.set(result.message ?? 'Ocurrió un error al iniciar sesión.');
      this.isSubmitting.set(false);
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const fallback = '/dashboard';
    this.isSubmitting.set(false);
    this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : fallback);
  }
}
