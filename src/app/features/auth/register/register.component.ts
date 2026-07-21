
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterCompanyRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface-muted">
      <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section class="relative hidden items-center justify-center bg-navy-900 p-12 lg:flex">
          <div class="relative z-10 max-w-md text-white">
            <p class="text-sm uppercase tracking-[0.3em] text-white/70">LexAr Suite</p>
            <h1 class="mt-6 text-3xl font-semibold leading-tight lg:text-4xl">Construye operaciones legales centradas en la evidencia</h1>
            <p class="mt-4 text-sm text-white/70">
              Integra gestión de clientes, procesos y analítica predictiva en una única plataforma diseñada para equipos legales corporativos.
            </p>
            <div class="mt-10 space-y-4 text-sm text-white/80">
              <div class="rounded-md bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-white/70">Beneficio</p>
                <p class="mt-2 text-lg font-semibold">Automatiza informes regulatorios en minutos.</p>
              </div>
              <div class="rounded-md bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-white/70">Confianza</p>
                <p class="mt-2 text-lg font-semibold">Cumplimiento ISO 27001 &amp; auditoría integrada.</p>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950/80 to-navy-900 opacity-90"></div>
        </section>

        <section class="flex items-center justify-center px-6 py-12 lg:px-12">
          <div class="w-full max-w-md rounded-lg border border-default bg-surface px-8 py-10 shadow-raised">
            <h2 class="text-2xl font-semibold text-text">Crear cuenta LexAr</h2>
            <p class="mt-2 text-sm text-subtle">Configura tu acceso y personaliza la experiencia de tu equipo.</p>

            <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="rounded-md border border-default bg-surface-muted p-4">
                <h3 class="text-sm font-semibold text-text">Datos del administrador</h3>
                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="firstName">Nombre</label>
                    <input
                      id="firstName"
                      type="text"
                      formControlName="firstName"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="Nombre"
                    />
                    @if (form.get('firstName')?.touched && form.get('firstName')?.invalid) {
                      <p class="text-xs text-danger">Campo requerido</p>
                    }
                  </div>
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="lastName">Apellido</label>
                    <input
                      id="lastName"
                      type="text"
                      formControlName="lastName"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="Apellido"
                    />
                    @if (form.get('lastName')?.touched && form.get('lastName')?.invalid) {
                      <p class="text-xs text-danger">Campo requerido</p>
                    }
                  </div>
                </div>
                <div class="mt-3 space-y-1">
                  <label class="block text-xs font-medium text-muted" for="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    autocomplete="off"
                    class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    placeholder="nombre@empresa.com"
                  />
                  @if (form.get('email')?.touched && form.get('email')?.invalid) {
                    <p class="text-xs text-danger">Correo inválido</p>
                  }
                </div>
                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="password">Contraseña</label>
                    <input
                      id="password"
                      type="password"
                      formControlName="password"
                      autocomplete="new-password"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="Mínimo 8 caracteres"
                    />
                    @if (form.get('password')?.touched && form.get('password')?.invalid) {
                      <p class="text-xs text-danger">Mínimo 8 caracteres</p>
                    }
                  </div>
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="confirmPassword">Confirmar</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      formControlName="confirmPassword"
                      autocomplete="new-password"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="Repite contraseña"
                    />
                    @if (passwordMismatch()) {
                      <p class="text-xs text-danger">No coinciden</p>
                    }
                  </div>
                </div>
              </div>

              <div class="rounded-md border border-default bg-surface-muted p-4">
                <h3 class="text-sm font-semibold text-text">Datos de la empresa</h3>
                <div class="mt-3 space-y-3">
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="legalName">Razón social</label>
                    <input
                      id="legalName"
                      type="text"
                      formControlName="legalName"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="Nombre legal de la empresa"
                    />
                    @if (form.get('legalName')?.touched && form.get('legalName')?.invalid) {
                      <p class="text-xs text-danger">Campo requerido</p>
                    }
                  </div>
                  <div class="space-y-1">
                    <label class="block text-xs font-medium text-muted" for="taxId">NIT / RUT</label>
                    <input
                      id="taxId"
                      type="text"
                      formControlName="taxId"
                      class="w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card transition focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      placeholder="123456789-0"
                    />
                    @if (form.get('taxId')?.touched && form.get('taxId')?.invalid) {
                      <p class="text-xs text-danger">Campo requerido</p>
                    }
                  </div>
                  <p class="text-xs text-subtle">
                    Podrás completar los demás datos de tu empresa (dirección, facturación, marca) después de crear la cuenta, desde Configuración.
                  </p>
                </div>
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
                <span>Crear cuenta</span>
                @if (isSubmitting()) {
                  <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                  </svg>
                }
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-subtle">
              ¿Ya tienes acceso? <a routerLink="/login" class="font-semibold text-navy-900 hover:underline">Inicia sesión</a>
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
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      legalName: ['', [Validators.required, Validators.minLength(3)]],
      taxId: ['', [Validators.required]],
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
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.form.getRawValue();
    const payload: RegisterCompanyRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      company: {
        legalName: formValue.legalName,
        taxId: formValue.taxId,
      },
    };

    this.authService.register(payload).subscribe({
      next: (result) => {
        if (!result.success) {
          this.errorMessage.set(result.message ?? 'No fue posible crear la cuenta.');
          this.isSubmitting.set(false);
          return;
        }

        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage.set(error.message ?? 'Error al conectar con el servidor.');
        this.isSubmitting.set(false);
      },
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }
}
