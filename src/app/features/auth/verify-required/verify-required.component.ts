import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 text-center shadow-raised backdrop-blur">
        <h1 class="text-2xl font-semibold text-text">Verifica tu correo para continuar</h1>
        <p class="mt-4 text-sm text-subtle">
          Enviamos un enlace de verificación a <span class="font-semibold text-text">{{ email() }}</span>.
          Ese correo es el contacto de facturación de tu empresa en LexAr, así que necesitamos confirmarlo antes de
          darte acceso al sistema.
        </p>

        @if (resendMessage()) {
          <div
            class="mt-6 rounded-md border px-4 py-3 text-sm"
            [class.border-default]="resendSuccess()"
            [class.bg-surface]="resendSuccess()"
            [class.text-text]="resendSuccess()"
            [class.border-danger]="!resendSuccess()"
            [class.bg-danger-tint]="!resendSuccess()"
            [class.text-danger]="!resendSuccess()"
          >
            {{ resendMessage() }}
          </div>
        }

        <button
          type="button"
          class="mt-6 w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:bg-strong"
          [disabled]="isResending()"
          (click)="resend()"
        >
          Reenviar correo de verificación
        </button>

        <button
          type="button"
          class="mt-3 w-full text-sm font-medium text-subtle hover:underline"
          (click)="logout()"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class VerifyRequiredComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isResending = signal(false);
  readonly resendMessage = signal<string | null>(null);
  readonly resendSuccess = signal(false);

  readonly email = computed(() => this.authService.currentUser()?.email ?? 'tu correo');

  resend(): void {
    if (this.isResending()) {
      return;
    }

    this.isResending.set(true);
    this.resendMessage.set(null);

    this.authService.resendVerification().subscribe((result) => {
      this.isResending.set(false);
      this.resendSuccess.set(result.success);
      this.resendMessage.set(
        result.success
          ? 'Te enviamos un nuevo enlace. Revisa tu bandeja de entrada.'
          : (result.message ?? 'No se pudo reenviar el correo.'),
      );
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
