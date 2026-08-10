import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as QRCode from 'qrcode';
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

        @if (!awaitingSetup() && !awaitingTwoFactor()) {
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
        } @else if (awaitingSetup()) {
          <p class="mt-2 text-sm text-white/60">
            La verificación en dos pasos es obligatoria para el panel de plataforma. Actívala para continuar.
          </p>

          @if (recoveryCodes(); as codes) {
            <div class="mt-6 rounded-md border border-white/20 bg-white/10 p-4">
              <p class="text-sm font-semibold text-white">Guarda tus códigos de recuperación</p>
              <p class="mt-1 text-xs text-white/60">
                Cada uno funciona una sola vez y no volverán a mostrarse.
              </p>
              <div class="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-white">
                @for (code of codes; track code) {
                  <span class="rounded bg-white/10 px-2 py-1 text-center">{{ code }}</span>
                }
              </div>
              <button
                type="button"
                class="mt-4 w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition"
                (click)="onFinishSetup()"
              >
                Ya los guardé, continuar
              </button>
            </div>
          } @else {
            <div class="mt-6 space-y-4">
              @if (qrDataUrl()) {
                <img [src]="qrDataUrl()" alt="Código QR para activar 2FA" class="h-40 w-40 rounded-md border border-white/20" />
              }
              @if (secret()) {
                <p class="rounded-md bg-white/10 px-3 py-2 font-mono text-xs text-white/70 break-all">{{ secret() }}</p>
              }

              <form class="space-y-4" [formGroup]="setupForm" (ngSubmit)="onSubmitSetup()">
                <label class="block text-sm font-medium text-white/80" for="setup-code">Código de 6 dígitos</label>
                <input
                  id="setup-code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  formControlName="code"
                  autocomplete="one-time-code"
                  autofocus
                  class="w-full max-w-[10rem] rounded-md border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
                  placeholder="123456"
                />

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
                  {{ isSubmitting() ? 'Confirmando…' : 'Confirmar y activar' }}
                </button>
              </form>
            </div>
          }
        } @else {
          <p class="mt-2 text-sm text-white/60">
            Ingresa el código de tu aplicación de autenticación (o un código de recuperación).
          </p>

          <form class="mt-8 space-y-5" [formGroup]="twoFactorForm" (ngSubmit)="onSubmitTwoFactor()">
            <label class="block text-sm font-medium text-white/80" for="code">Código</label>
            <input
              id="code"
              type="text"
              inputmode="numeric"
              formControlName="code"
              autocomplete="one-time-code"
              autofocus
              class="w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
              placeholder="123456"
            />

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
              {{ isSubmitting() ? 'Verificando…' : 'Verificar' }}
            </button>

            <button
              type="button"
              class="w-full text-center text-sm font-medium text-white/70 hover:underline"
              (click)="onBackToLogin()"
            >
              Volver al inicio de sesión
            </button>
          </form>
        }
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
  readonly pendingToken = signal<string | null>(null);

  // F11 (S10): 2FA obligatorio sin excepción — login recurrente (código).
  readonly awaitingTwoFactor = signal(false);
  readonly twoFactorForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });

  // F11 (S10): primer login sin 2FA activado todavía — enrolamiento forzado.
  readonly awaitingSetup = signal(false);
  readonly setupForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });
  readonly otpauthUri = signal<string | null>(null);
  readonly secret = signal<string | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly qrDataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const uri = this.otpauthUri();
      if (!uri) {
        this.qrDataUrl.set(null);
        return;
      }
      QRCode.toDataURL(uri)
        .then((dataUrl) => this.qrDataUrl.set(dataUrl))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

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
      next: (result) => {
        this.isSubmitting.set(false);
        this.pendingToken.set(result.pendingToken);

        if (result.requiresSetup) {
          this.awaitingSetup.set(true);
          this.startSetup(result.pendingToken);
          return;
        }

        this.awaitingTwoFactor.set(true);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }

  private startSetup(pendingToken: string): void {
    this.platformAdminService.setupTwoFactor(pendingToken).subscribe({
      next: (result) => {
        this.otpauthUri.set(result.otpauthUri);
        this.secret.set(result.secret);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.onBackToLogin();
      },
    });
  }

  onSubmitSetup(): void {
    if (this.isSubmitting()) {
      return;
    }
    const pendingToken = this.pendingToken();
    if (this.setupForm.invalid || !pendingToken) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { code } = this.setupForm.getRawValue();

    this.platformAdminService.verifyTwoFactorSetup(pendingToken, code).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.recoveryCodes.set(result.recoveryCodes);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }

  onFinishSetup(): void {
    this.navigateAfterLogin();
  }

  onSubmitTwoFactor(): void {
    if (this.isSubmitting()) {
      return;
    }
    const pendingToken = this.pendingToken();
    if (this.twoFactorForm.invalid || !pendingToken) {
      this.twoFactorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { code } = this.twoFactorForm.getRawValue();

    this.platformAdminService.loginWithTwoFactor(pendingToken, code).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.navigateAfterLogin();
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }

  onBackToLogin(): void {
    this.awaitingTwoFactor.set(false);
    this.awaitingSetup.set(false);
    this.pendingToken.set(null);
    this.otpauthUri.set(null);
    this.secret.set(null);
    this.recoveryCodes.set(null);
    this.errorMessage.set(null);
    this.twoFactorForm.reset();
    this.setupForm.reset();
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl && returnUrl !== '/admin/login' ? returnUrl : '/admin/tenants');
  }
}
