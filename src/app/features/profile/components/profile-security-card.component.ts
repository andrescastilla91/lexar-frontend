import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-profile-security-card',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-text">Verificación en dos pasos</h2>
          <p class="mt-1 text-sm text-subtle">
            Añade una capa extra de seguridad pidiendo un código de tu aplicación de autenticación al iniciar sesión.
          </p>
        </div>
        @if (twoFactorEnabled() && !recoveryCodes()) {
          <span class="shrink-0 rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success">
            Activo
          </span>
        }
      </div>

      @if (recoveryCodes(); as codes) {
        <div class="mt-6 rounded-md border border-warning bg-warning-tint p-4">
          <p class="text-sm font-semibold text-text">Guarda tus códigos de recuperación</p>
          <p class="mt-1 text-xs text-subtle">
            Úsalos si pierdes acceso a tu aplicación de autenticación. Cada uno funciona una sola vez y no volverán a mostrarse.
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-text sm:grid-cols-3">
            @for (code of codes; track code) {
              <span class="rounded bg-surface px-2 py-1 text-center">{{ code }}</span>
            }
          </div>
          <button
            type="button"
            class="mt-4 w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 sm:w-auto"
            (click)="dismissRecoveryCodes.emit()"
          >
            Ya los guardé
          </button>
        </div>
      } @else if (!twoFactorEnabled() && !isSettingUp()) {
        <button
          type="button"
          class="mt-6 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
          [disabled]="isStarting()"
          (click)="startSetup.emit()"
        >
          Activar verificación en dos pasos
        </button>
      } @else if (isSettingUp()) {
        <div class="mt-6 space-y-4">
          <p class="text-sm text-muted">
            Escanea este código con Google Authenticator, Authy o una app similar, o ingresa la clave manualmente.
          </p>

          @if (qrDataUrl()) {
            <img [src]="qrDataUrl()" alt="Código QR para activar 2FA" class="h-40 w-40 rounded-md border border-default" />
          }

          @if (secret()) {
            <p class="rounded-md bg-surface-alt px-3 py-2 font-mono text-xs text-subtle break-all">{{ secret() }}</p>
          }

          <label class="block text-sm text-muted">
            Código de 6 dígitos
            <input
              #codeInput
              type="text"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              class="mt-2 w-full max-w-[10rem] rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>

          @if (verifyError()) {
            <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              {{ verifyError() }}
            </div>
          }

          <div class="flex gap-3">
            <button
              type="button"
              class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
              [disabled]="isVerifying()"
              (click)="confirmSetup.emit(codeInput.value)"
            >
              Confirmar y activar
            </button>
            @if (allowCancel()) {
              <button
                type="button"
                class="rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-alt"
                [disabled]="isVerifying()"
                (click)="cancelSetup.emit()"
              >
                Cancelar
              </button>
            }
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-4" [formGroup]="disableForm()" (ngSubmit)="disable.emit()">
          <p class="text-sm text-muted">
            Confirma tu contraseña y un código vigente (o un código de recuperación) para desactivarla o para regenerar tus códigos de recuperación.
          </p>

          <label class="block text-sm text-muted">
            Contraseña actual
            <input
              formControlName="password"
              type="password"
              autocomplete="current-password"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>

          <label class="block text-sm text-muted">
            Código de verificación
            <input
              formControlName="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              class="mt-2 w-full max-w-[10rem] rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>

          @if (disableError()) {
            <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              {{ disableError() }}
            </div>
          }

          @if (regenerateCodesError()) {
            <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              {{ regenerateCodesError() }}
            </div>
          }

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-alt disabled:opacity-50"
              [disabled]="isRegeneratingCodes() || disableForm().invalid"
              (click)="regenerateRecoveryCodes.emit()"
            >
              Regenerar códigos de recuperación
            </button>

            <button
              type="submit"
              class="rounded-md border border-danger px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger-tint disabled:opacity-50"
              [disabled]="isDisabling() || disableForm().invalid"
            >
              Desactivar verificación en dos pasos
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ProfileSecurityCardComponent {
  twoFactorEnabled = input(false);
  isSettingUp = input(false);
  isStarting = input(false);
  allowCancel = input(true);
  otpauthUri = input<string | null>(null);
  secret = input<string | null>(null);
  isVerifying = input(false);
  verifyError = input<string | null>(null);
  recoveryCodes = input<string[] | null>(null);
  disableForm = input.required<FormGroup>();
  isDisabling = input(false);
  disableError = input<string | null>(null);
  isRegeneratingCodes = input(false);
  regenerateCodesError = input<string | null>(null);

  startSetup = output<void>();
  cancelSetup = output<void>();
  confirmSetup = output<string>();
  dismissRecoveryCodes = output<void>();
  disable = output<void>();
  regenerateRecoveryCodes = output<void>();

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
}
