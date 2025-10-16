import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-100">
      <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section class="relative hidden items-center justify-center bg-[#192033] p-12 lg:flex">
          <div class="relative z-10 max-w-md text-white">
            <p class="text-sm uppercase tracking-[0.3em] text-slate-300">LexAr Suite</p>
            <h1 class="mt-6 text-3xl font-semibold leading-tight lg:text-4xl">Construye operaciones legales centradas en la evidencia</h1>
            <p class="mt-4 text-sm text-slate-300">
              Integra gestión de clientes, procesos y analítica predictiva en una única plataforma diseñada para equipos legales corporativos.
            </p>
            <div class="mt-10 space-y-4 text-sm text-slate-200">
              <div class="rounded-2xl bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-300">Beneficio</p>
                <p class="mt-2 text-lg font-semibold">Automatiza informes regulatorios en minutos.</p>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-300">Confianza</p>
                <p class="mt-2 text-lg font-semibold">Cumplimiento ISO 27001 &amp; auditoría integrada.</p>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-br from-[#192033] via-slate-900/80 to-[#192033] opacity-90"></div>
        </section>

        <section class="flex items-center justify-center px-6 py-12 lg:px-12">
          <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-xl">
            <h2 class="text-2xl font-semibold text-slate-800">Crear cuenta LexAr</h2>
            <p class="mt-2 text-sm text-slate-500">Configura tu acceso y personaliza la experiencia de tu equipo.</p>

            <form class="mt-8 space-y-6" [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-600" for="fullName">Nombre completo</label>
                <input
                  id="fullName"
                  type="text"
                  formControlName="fullName"
                  class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  placeholder="Nombre y apellidos"
                />
                @if (form.get('fullName')?.touched && form.get('fullName')?.invalid) {
                  <p class="text-sm text-rose-500">Incluye tu nombre completo.</p>
                }
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-600" for="email">Correo corporativo</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  placeholder="nombre@empresa.com"
                />
                @if (form.get('email')?.touched && form.get('email')?.invalid) {
                  <p class="text-sm text-rose-500">Ingresa un correo válido.</p>
                }
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-slate-600" for="password">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    formControlName="password"
                    class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    placeholder="••••••••"
                  />
                  @if (form.get('password')?.touched && form.get('password')?.invalid) {
                    <p class="text-sm text-rose-500">Usa al menos 8 caracteres.</p>
                  }
                </div>
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-slate-600" for="confirmPassword">Confirmar contraseña</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    formControlName="confirmPassword"
                    class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    placeholder="Repite tu contraseña"
                  />
                  @if (passwordMismatch()) {
                    <p class="text-sm text-rose-500">Las contraseñas no coinciden.</p>
                  }
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-600" for="role">Rol dentro del equipo</label>
                <select
                  id="role"
                  formControlName="role"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                >
                  <option value="assistant">Asistente legal</option>
                  <option value="advisor">Abogado / Asesor</option>
                  <option value="admin">Director jurídico</option>
                </select>
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
                <span>Crear cuenta</span>
                @if (isSubmitting()) {
                  <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                  </svg>
                }
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-slate-500">
              ¿Ya tienes acceso? <a routerLink="/login" class="font-semibold text-[#192033] hover:underline">Inicia sesión</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      role: ['assistant', Validators.required],
    },
    { validators: (control) => this.passwordsMatchValidator(control) }
  );

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly passwordMismatch = computed(() => {
    const groupError = this.form.errors?.['passwordMismatch'];
    const controlTouched = this.form.get('confirmPassword')?.touched;
    return Boolean(groupError && controlTouched);
  });

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

  const { fullName, email, password, role } = this.form.getRawValue();
  const result = this.authService.register({ fullName, email, password, role: role as UserRole });

    if (!result.success) {
      this.errorMessage.set(result.message ?? 'No fue posible crear la cuenta.');
      this.isSubmitting.set(false);
      return;
    }

    this.isSubmitting.set(false);
    this.router.navigate(['/dashboard']);
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }
}
