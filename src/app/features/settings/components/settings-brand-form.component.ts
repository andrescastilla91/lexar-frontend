import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-brand-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Marca</h2>
      <p class="mt-1 text-sm text-subtle">Logo y sitio web que verán tus clientes y equipo.</p>

      <div class="mt-4 flex items-center gap-4">
        <div class="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md border border-default bg-surface-muted">
          @if (logoUrl()) {
            <img [src]="logoUrl()" alt="Logo de la empresa" class="h-full w-full rounded-md object-contain p-1" />
          } @else {
            <svg class="h-8 w-8 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 8.25V15a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 15V8.25M3 8.25A2.25 2.25 0 0 1 5.25 6h13.5A2.25 2.25 0 0 1 21 8.25M3 8.25v-1.5A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v1.5" />
            </svg>
          }
          @if (isUploadingLogo()) {
            <div class="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
              <svg class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
              </svg>
            </div>
          }
        </div>
        <div>
          <label class="cursor-pointer text-sm font-semibold text-navy-900 hover:underline">
            Cambiar logo
            <input type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)" [disabled]="isUploadingLogo()" />
          </label>
          <p class="mt-1 text-xs text-subtle">JPG o PNG, máximo 5MB.</p>
        </div>
      </div>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <label class="block text-sm text-muted">
          Sitio web
          <input
            formControlName="website"
            type="text"
            placeholder="https://tuempresa.com"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
          [disabled]="isSubmitting() || form().invalid"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsBrandFormComponent {
  form = input.required<FormGroup>();
  logoUrl = input<string | null>(null);
  isSubmitting = input(false);
  isUploadingLogo = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
  logoSelected = output<File>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.logoSelected.emit(file);
    }
    input.value = '';
  }
}
