import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface GeneratedPasswordData {
  email: string;
  password: string;
}

@Component({
  selector: 'app-generated-password-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div class="w-full max-w-sm md:max-w-md rounded-lg border-2 border-success bg-surface p-4 md:p-6 shadow-2xl">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-success-tint">
              <svg class="h-6 w-6 text-success" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-success">¡Usuario creado exitosamente!</h3>
              <p class="text-sm text-success">Contraseña generada automáticamente</p>
            </div>
          </div>

          <div class="mb-4 rounded-md bg-warning-tint border border-warning p-4">
            <div class="flex items-start gap-2">
              <svg class="h-5 w-5 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div class="text-sm text-warning">
                <strong>¡IMPORTANTE!</strong> Esta contraseña solo se mostrará una vez. Guárdala de forma segura antes de cerrar esta ventana.
              </div>
            </div>
          </div>

          <div class="mb-4 space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-subtle">Email del usuario</label>
              <p class="mt-1 text-sm font-medium text-text">{{ data()?.email }}</p>
            </div>

            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-subtle">Contraseña temporal</label>
              <div class="mt-1 flex items-center gap-2">
                <code class="flex-1 rounded-md border border-default bg-surface-muted px-4 py-3 font-mono text-sm font-semibold text-text select-all">
                  {{ data()?.password }}
                </code>
                <button
                  type="button"
                  (click)="copyToClipboard()"
                  class="rounded-md bg-navy-900 p-3 text-white transition hover:bg-navy-950"
                  title="Copiar al portapapeles"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="mb-4 rounded-md border border-default bg-surface-muted p-3 text-xs text-muted">
            <strong>Próximos pasos:</strong>
            <ol class="mt-2 ml-4 list-decimal space-y-1">
              <li>Copia la contraseña usando el botón de copiar</li>
              <li>Envía las credenciales al usuario de forma segura (email, mensaje cifrado, etc.)</li>
              <li>El usuario debe cambiar esta contraseña en su primer inicio de sesión</li>
            </ol>
          </div>

          <button
            type="button"
            (click)="close.emit()"
            class="w-full rounded-md bg-success px-4 py-3 text-sm font-semibold text-white transition hover:bg-success"
          >
            Entendido, he guardado la contraseña
          </button>
        </div>
      </div>
    }
  `,
})
export class GeneratedPasswordModalComponent {
  data = input<GeneratedPasswordData | null>(null);

  close = output<void>();

  copyToClipboard(): void {
    const password = this.data()?.password;
    if (!password) return;

    navigator.clipboard.writeText(password).then(
      () => {
        alert('Contraseña copiada al portapapeles');
      },
      (err) => {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar la contraseña');
      }
    );
  }
}
