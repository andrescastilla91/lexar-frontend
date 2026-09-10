import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileSecurityCardComponent } from '../../profile/components/profile-security-card.component';

@Component({
  selector: 'app-two-factor-required',
  standalone: true,
  imports: [ProfileSecurityCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-lg">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-semibold text-text">Tu empresa exige verificación en dos pasos</h1>
          <p class="mt-2 text-sm text-subtle">
            Actívala ahora para poder seguir usando LexAr.
          </p>
        </div>

        <app-profile-security-card
          [twoFactorEnabled]="false"
          [allowCancel]="false"
          [isSettingUp]="isSettingUp()"
          [isStarting]="isStarting()"
          [otpauthUri]="otpauthUri()"
          [secret]="secret()"
          [isVerifying]="isVerifying()"
          [verifyError]="verifyError()"
          [recoveryCodes]="recoveryCodes()"
          [disableForm]="disableFormPlaceholder"
          (startSetup)="onStartSetup()"
          (cancelSetup)="onCancelSetup()"
          (confirmSetup)="onConfirmSetup($event)"
          (dismissRecoveryCodes)="onDismissRecoveryCodes()"
        />

        <button
          type="button"
          class="mt-4 w-full text-center text-sm font-medium text-subtle hover:underline"
          (click)="logout()"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class TwoFactorRequiredComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // La tarjeta exige un FormGroup para el bloque de desactivación, que aquí nunca se muestra
  // (el usuario todavía no tiene 2FA activo) — se pasa uno vacío solo para satisfacer el input.
  readonly disableFormPlaceholder = this.fb.nonNullable.group({
    password: ['', Validators.required],
    code: ['', Validators.required],
  });

  readonly isStarting = signal(false);
  readonly isSettingUp = signal(false);
  readonly otpauthUri = signal<string | null>(null);
  readonly secret = signal<string | null>(null);
  readonly isVerifying = signal(false);
  readonly verifyError = signal<string | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);

  constructor() {
    this.onStartSetup();
  }

  onStartSetup(): void {
    if (this.isStarting()) {
      return;
    }

    this.isStarting.set(true);
    this.authService.setupTwoFactor().subscribe({
      next: (res) => {
        this.otpauthUri.set(res.otpauthUri);
        this.secret.set(res.secret);
        this.isSettingUp.set(true);
        this.isStarting.set(false);
      },
      error: () => {
        this.isStarting.set(false);
      },
    });
  }

  onCancelSetup(): void {
    // No aplica aquí: es obligatorio, no se puede cancelar sin desactivar la política.
  }

  onConfirmSetup(code: string): void {
    if (this.isVerifying() || !code?.trim()) {
      return;
    }

    this.isVerifying.set(true);
    this.verifyError.set(null);

    this.authService.verifyTwoFactor(code.trim()).subscribe({
      next: (res) => {
        this.recoveryCodes.set(res.recoveryCodes);
        this.isSettingUp.set(false);
        this.isVerifying.set(false);
      },
      error: (error) => {
        // BUG-20 ola 3: error.message, no error.error?.message — ver
        // comentario en settings.component.ts.
        this.verifyError.set(error.message || 'El código ingresado no es válido.');
        this.isVerifying.set(false);
      },
    });
  }

  onDismissRecoveryCodes(): void {
    this.recoveryCodes.set(null);
    this.router.navigateByUrl('/dashboard');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
