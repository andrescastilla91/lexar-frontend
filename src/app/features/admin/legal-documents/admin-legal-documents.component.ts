import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  LEGAL_DOCUMENT_TYPE_OPTIONS,
  LegalDocumentAdmin,
  LegalDocumentType,
} from '../../../core/models/admin.model';

// F44 §LEG-05 (ola 6): pantalla de super admin para publicar versiones de
// los documentos legales de la plataforma (términos de uso, política de
// tratamiento de datos) — hasta ahora solo existía el backend (ola 1),
// probado por sus propios e2e, sin ninguna UI que lo llamara. Mismo patrón
// que AdminHolidaysComponent: listado + formulario de alta, sin edición ni
// borrado (una versión publicada no se corrige, se reemplaza con otra).
@Component({
  selector: 'app-admin-legal-documents',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-text">Documentos legales</h1>
        <button
          type="button"
          class="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white"
          (click)="togglePublishForm()"
        >
          {{ showPublishForm() ? 'Cancelar' : 'Publicar nueva versión' }}
        </button>
      </div>

      @if (showPublishForm()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="publishForm" (ngSubmit)="onPublish()">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="block text-xs uppercase text-subtle" for="legal-doc-type">Tipo de documento</label>
              <select
                id="legal-doc-type"
                formControlName="type"
                class="mt-1 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
              >
                @for (option of typeOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle" for="legal-doc-version">Versión</label>
              <input
                id="legal-doc-version"
                formControlName="version"
                placeholder="1.0"
                class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm"
              />
            </div>
            <div class="flex items-end pb-2">
              <label class="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" formControlName="isSubstantialChange" class="rounded border-default" />
                Cambio sustancial (obliga a re-aceptar)
              </label>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-xs uppercase text-subtle" for="legal-doc-file">Archivo (PDF o Word)</label>
            <input
              id="legal-doc-file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="mt-1 w-full text-sm text-text"
              (change)="onFileSelected($event)"
            />
            @if (selectedFile(); as file) {
              <p class="mt-1 text-xs text-subtle">Seleccionado: {{ file.name }}</p>
            }
          </div>

          <button
            type="submit"
            class="mt-4 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="publishForm.invalid || !selectedFile() || isSaving()"
          >
            Publicar documento
          </button>
        </form>
      }

      <div class="flex items-center gap-3">
        <label class="text-xs uppercase text-subtle" for="legal-doc-type-filter">Tipo</label>
        <select
          id="legal-doc-type-filter"
          class="rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
          [value]="selectedTypeFilter()"
          (change)="onTypeFilterChange($event)"
        >
          <option value="all">Todos</option>
          @for (option of typeOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      <div class="overflow-x-auto rounded-lg border border-default bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-muted text-xs uppercase text-subtle">
            <tr>
              <th class="px-4 py-2">Tipo</th>
              <th class="px-4 py-2">Versión</th>
              <th class="px-4 py-2">Archivo</th>
              <th class="px-4 py-2">Sustancial</th>
              <th class="px-4 py-2">Publicado</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (doc of filteredDocuments(); track doc.id) {
              <tr class="border-t border-default">
                <td class="px-4 py-2 text-text">{{ typeLabel(doc.type) }}</td>
                <td class="px-4 py-2 text-text">{{ doc.version }}</td>
                <td class="px-4 py-2 text-text">{{ doc.originalFilename }}</td>
                <td class="px-4 py-2 text-text">{{ doc.isSubstantialChange ? 'Sí' : 'No' }}</td>
                <td class="px-4 py-2 text-text">{{ formatDate(doc.publishedAt) }}</td>
                <td class="px-4 py-2 text-right">
                  @if (doc.isCurrent) {
                    <span class="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">Vigente</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td class="px-4 py-6 text-center text-subtle" colspan="6">
                  No hay documentos publicados para este filtro. Nadie queda bloqueado por el gate de términos mientras no exista
                  una versión vigente de "Términos de uso interno".
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminLegalDocumentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly toast = inject(ToastService);

  readonly typeOptions = LEGAL_DOCUMENT_TYPE_OPTIONS;

  readonly documents = signal<LegalDocumentAdmin[]>([]);
  readonly isSaving = signal(false);
  readonly showPublishForm = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedTypeFilter = signal<LegalDocumentType | 'all'>('all');

  readonly filteredDocuments = computed(() => {
    const type = this.selectedTypeFilter();
    const documents = this.documents();
    return type === 'all' ? documents : documents.filter((d) => d.type === type);
  });

  readonly publishForm = this.fb.nonNullable.group({
    type: [this.typeOptions[0].value, Validators.required],
    version: ['', [Validators.required, Validators.pattern(/^\d+(\.\d+)*$/)]],
    isSubstantialChange: [true],
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.platformAdminService.listLegalDocuments().subscribe({
      next: (documents) => this.documents.set(documents),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  typeLabel(type: LegalDocumentType): string {
    return this.typeOptions.find((option) => option.value === type)?.label ?? type;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onTypeFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as LegalDocumentType | 'all';
    this.selectedTypeFilter.set(value);
  }

  togglePublishForm(): void {
    this.showPublishForm.set(!this.showPublishForm());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  onPublish(): void {
    const file = this.selectedFile();
    if (this.publishForm.invalid || !file || this.isSaving()) {
      this.publishForm.markAllAsTouched();
      return;
    }

    const value = this.publishForm.getRawValue();
    this.isSaving.set(true);
    this.platformAdminService
      .publishLegalDocument({
        type: value.type as LegalDocumentType,
        version: value.version,
        isSubstantialChange: value.isSubstantialChange,
        file,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showPublishForm.set(false);
          this.publishForm.reset({ type: this.typeOptions[0].value, version: '', isSubstantialChange: true });
          this.selectedFile.set(null);
          this.toast.success('Documento publicado correctamente.');
          this.loadDocuments();
        },
        error: (error: Error) => {
          this.isSaving.set(false);
          this.toast.error(error.message);
        },
      });
  }
}
