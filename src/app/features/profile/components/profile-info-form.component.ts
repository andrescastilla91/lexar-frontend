import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-info-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Datos personales</h2>

      <div class="mt-4 flex flex-wrap items-center gap-4">
        <div class="relative h-16 w-16 flex-shrink-0">
          @if (avatarUrl()) {
            <img [src]="avatarUrl()" alt="Foto de perfil" class="h-16 w-16 rounded-full object-cover" />
          } @else {
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white">
              {{ initials() }}
            </div>
          }
          @if (isUploadingAvatar()) {
            <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <svg class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
              </svg>
            </div>
          }
        </div>
        <div>
          <label class="cursor-pointer text-sm font-semibold text-navy-900 hover:underline">
            Cambiar foto
            <input type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)" [disabled]="isUploadingAvatar()" />
          </label>
          <p class="mt-1 text-xs text-subtle">JPG o PNG, máximo 5MB.</p>
        </div>
      </div>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Nombre
            <input
              formControlName="firstName"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            Apellido
            <input
              formControlName="lastName"
              type="text"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
        </div>

        <label class="block text-sm text-muted">
          Teléfono
          <input
            formControlName="phone"
            type="text"
            placeholder="3001234567"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        <fieldset>
          <legend class="text-sm text-muted">Tema</legend>
          <div class="mt-2 grid grid-cols-3 gap-2">
            @for (option of themeOptions; track option.value) {
              <label
                class="cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition"
                [class.border-navy-900]="form().get('themePreference')?.value === option.value"
                [class.bg-navy-900]="form().get('themePreference')?.value === option.value"
                [class.text-white]="form().get('themePreference')?.value === option.value"
                [class.border-default]="form().get('themePreference')?.value !== option.value"
                [class.text-muted]="form().get('themePreference')?.value !== option.value"
              >
                <input type="radio" formControlName="themePreference" [value]="option.value" class="hidden" />
                {{ option.label }}
              </label>
            }
          </div>
        </fieldset>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong sm:w-auto"
          [disabled]="isSubmitting() || form().invalid"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class ProfileInfoFormComponent {
  form = input.required<FormGroup>();
  avatarUrl = input<string | null>(null);
  initials = input('');
  isSubmitting = input(false);
  isUploadingAvatar = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
  avatarSelected = output<File>();

  readonly themeOptions = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Sistema' },
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.avatarSelected.emit(file);
    }
    input.value = '';
  }
}
