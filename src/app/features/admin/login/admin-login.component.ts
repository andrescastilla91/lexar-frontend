import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-navy-900 px-6">
      <div class="w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p class="text-xs uppercase tracking-[0.3em] text-white/60">LexAr</p>
        <h1 class="mt-2 text-2xl font-semibold text-white">Panel de plataforma</h1>
        <p class="mt-2 text-sm text-white/60">Acceso exclusivo para el equipo de LexAr.</p>

        <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-white/80" for="email">Correo</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="off"
              class="w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
              placeholder="admin@lexar.com"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-white/80" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          @if (errorMessage()) {
            <div class="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
              {{ errorMessage() }}
            </div>
          }

          <button
            type="submit"
            class="w-full rounded-md bg-white px-4 py-3 text-base font-semibold text-navy-900 transition disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="isSubmitting()"
          >
            {{ isSubmitting() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AdminLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    if (this.platformAdminService.isAuthenticated()) {
      this.router.navigate(['/admin/tenants']);
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

    this.platformAdminService.login(email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl && returnUrl !== '/admin/login' ? returnUrl : '/admin/tenants');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }
}
