import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

interface EntityOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-document-upload-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <section class="rounded-md border border-default bg-gradient-to-br from-primary-tint to-surface p-4 shadow-card">
        <form [formGroup]="form()" (ngSubmit)="submit.emit()" class="space-y-3">
          <div class="grid gap-3 md:grid-cols-3">
            <label class="text-sm font-medium text-text">
              Tipo
              <select
                formControlName="entityType"
                (change)="entityTypeChange.emit()"
                class="mt-1.5 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="legal_process">Proceso Legal</option>
                <option value="client">Cliente</option>
              </select>
            </label>

            <label class="text-sm font-medium text-text md:col-span-2">
              {{ form().value.entityType === 'legal_process' ? 'Proceso' : 'Cliente' }}
              <select
                formControlName="entityId"
                class="mt-1.5 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleccione...</option>
                @if (form().value.entityType === 'legal_process') {
                  @for (process of processes(); track process.id) {
                    <option [value]="process.id">{{ process.label }}</option>
                  }
                } @else {
                  @for (client of clients(); track client.id) {
                    <option [value]="client.id">{{ client.label }}</option>
                  }
                }
              </select>
            </label>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch gap-2">
            <label class="flex-1 cursor-pointer">
              <div class="h-full flex items-center gap-3 rounded-md border-2 border-dashed {{ selectedFile() ? 'border-primary bg-info-tint' : 'border-strong bg-surface' }} px-4 py-3 transition hover:border-primary hover:bg-primary-tint">
                <svg class="h-6 w-6 {{ selectedFile() ? 'text-primary' : 'text-subtle' }}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-text truncate">
                    @if (selectedFile()) {
                      {{ selectedFile()?.name }}
                    } @else {
                      Seleccionar archivo
                    }
                  </p>
                  <p class="text-xs text-subtle">
                    @if (selectedFile()) {
                      {{ selectedFileSizeLabel() }}
                    } @else {
                      PDF, Word, Excel, imágenes
                    }
                  </p>
                </div>
              </div>
              <input type="file" class="sr-only" (change)="onFileSelected($event)" />
            </label>

            <button
              type="submit"
              [disabled]="form().invalid || !selectedFile() || isUploading()"
              class="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-strong"
            >
              @if (isUploading()) {
                <div class="flex items-center gap-2">
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                  </svg>
                  Subiendo...
                </div>
              } @else {
                Subir
              }
            </button>
          </div>

          @if (uploadError()) {
            <div class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
              {{ uploadError() }}
            </div>
          }
        </form>
      </section>
    }
  `,
})
export class DocumentUploadPanelComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  selectedFile = input<File | null>(null);
  selectedFileSizeLabel = input('');
  isUploading = input(false);
  uploadError = input<string | null>(null);
  processes = input<EntityOption[]>([]);
  clients = input<EntityOption[]>([]);

  entityTypeChange = output<void>();
  fileSelected = output<File>();
  submit = output<void>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
    }
  }
}
