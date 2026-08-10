import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { formatBytes } from '../utils/process-format.utils';

@Component({
  selector: 'app-process-annotation-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
          class="w-full max-w-sm md:max-w-2xl lg:max-w-4xl grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <h3 class="text-lg font-semibold text-text">Agregar anotación</h3>
          <strong>Proceso: </strong>
          <h4 class="text-lg text-subtle"> {{ processTitle() }}</h4>

          <div class="grid gap-4">
            <label class="text-sm text-muted">
              Descripción *
              <textarea
                formControlName="description"
                placeholder="Describe el evento, acción o nota importante..."
                rows="4"
                maxlength="2000"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              ></textarea>
              <p class="mt-1 text-xs text-subtle">
                {{ form().get('description')?.value?.length || 0 }} / 2000 caracteres
              </p>
            </label>

            <!-- Cargar archivos opcionales -->
            <div class="border-t border-default pt-4">
              <label class="text-sm font-semibold text-text">
                Archivos adjuntos (opcional)
                <div class="mt-2 flex items-center gap-2">
                  <div class="flex-1 cursor-pointer">
                    <div class="flex items-center gap-3 rounded-md border-2 border-dashed {{ files().length > 0 ? 'border-primary bg-primary-tint' : 'border-strong bg-surface-muted' }} px-4 py-3 transition hover:border-primary hover:bg-primary-tint">
                      <svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                      <div class="flex-1 min-w-0">
                        <input
                          type="file"
                          multiple
                          (change)="filesSelected.emit($event)"
                          class="hidden"
                          #annotationFileInput
                        />
                        <p class="text-sm font-medium text-text">
                          @if (files().length > 0) {
                            {{ files().length }} archivo(s) seleccionado(s)
                          } @else {
                            Seleccionar archivos
                          }
                        </p>
                        <p class="text-xs text-subtle">Click para adjuntar archivos a esta anotación</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="annotationFileInput.click()"
                    class="rounded-md border border-default px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-muted"
                  >
                    Adjuntar
                  </button>
                </div>
              </label>

              <!-- Lista de archivos seleccionados -->
              @if (files().length > 0) {
                <div class="mt-3 space-y-2">
                  @for (file of files(); track $index) {
                    <div class="flex items-center justify-between rounded-lg border border-default bg-surface px-3 py-2">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <svg class="h-4 w-4 text-subtle flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span class="text-sm text-text truncate">{{ file.name }}</span>
                        <span class="text-xs text-subtle">{{ formatBytes(file.size) }}</span>
                      </div>
                      <button
                        type="button"
                        (click)="removeFile.emit($index)"
                        class="rounded p-1 text-subtle hover:bg-danger-tint hover:text-danger"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          @if (errorMessage()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
          }

          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
              [disabled]="isSubmitting() || form().invalid"
            >
              Guardar anotación
            </button>
            <button
              type="button"
              (click)="close.emit()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class ProcessAnnotationModalComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  processTitle = input<string | null>(null);
  files = input<File[]>([]);

  close = output<void>();
  submit = output<void>();
  filesSelected = output<Event>();
  removeFile = output<number>();

  protected readonly formatBytes = formatBytes;
}
