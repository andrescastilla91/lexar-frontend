import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilesService } from '../services/files.service';
import { FileModel } from '../models/file.model';
import { HasPermissionDirective } from '../directives/has-permission.directive';

/**
 * Componente reutilizable para mostrar y gestionar archivos de una entidad
 * Puede usarse en procesos, clientes, etc.
 */
@Component({
  selector: 'app-entity-files',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  template: `
    <div class="space-y-4">
      <!-- Header con botón de carga -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">
          <svg class="inline-block h-4 w-4 mr-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Archivos ({{ files().length }})
        </h3>

        <label *hasPermission="['files.upload']" class="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
          <svg class="inline-block h-4 w-4 mr-1" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          Subir archivo
          <input
            type="file"
            class="sr-only"
            (change)="onFileSelected($event)"
            [disabled]="uploading()"
          />
        </label>
      </div>

      <!-- Upload progress -->
      @if (uploading()) {
        <div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div class="flex items-center gap-3">
            <svg class="h-4 w-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
            </svg>
            <span class="text-sm font-medium text-blue-700">Subiendo...</span>
          </div>
        </div>
      }

      <!-- Error message -->
      @if (uploadError()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ uploadError() }}
        </div>
      }

      <!-- Lista de archivos -->
      @if (loading()) {
        <div class="flex justify-center py-8">
          <svg class="h-6 w-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
          </svg>
        </div>
      } @else if (files().length === 0) {
        <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center">
          <svg class="mx-auto h-8 w-8 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p class="mt-2 text-sm text-slate-500">Sin archivos adjuntos</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (file of files(); track file.id) {
            <div class="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ getFileIcon(file.contentType) }}</span>
                <div>
                  <p class="text-sm font-medium text-slate-800">{{ file.originalFilename }}</p>
                  <p class="text-xs text-slate-500">{{ file.formattedSize }} • {{ formatDate(file.createdAt) }}</p>
                </div>
              </div>

              <div class="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                @if (file.isPreviewable) {
                  <button
                    (click)="previewFile(file)"
                    class="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50"
                    title="Vista previa"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                }

                <button
                  (click)="downloadFile(file)"
                  class="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                  title="Descargar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>

                <button
                  *hasPermission="['files.delete']"
                  (click)="deleteFile(file)"
                  class="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                  title="Eliminar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal de preview (simple) -->
    @if (previewUrl()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        (click)="closePreview()"
      >
        <div class="relative max-h-[90vh] max-w-4xl w-full overflow-hidden rounded-3xl bg-white" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 class="text-lg font-semibold text-slate-800">{{ previewingFile()?.originalFilename }}</h3>
            <button
              (click)="closePreview()"
              class="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="max-h-[80vh] overflow-auto p-6">
            @if (previewingFile()?.isImage) {
              <img [src]="previewUrl()!" [alt]="previewingFile()!.originalFilename" class="mx-auto max-w-full rounded-2xl" />
            } @else if (previewingFile()?.isPdf) {
              <iframe [src]="previewUrl()!" class="h-[70vh] w-full rounded-2xl border"></iframe>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class EntityFilesComponent implements OnInit {
  @Input({ required: true }) entityType!: string;
  @Input({ required: true }) entityId!: string;

  private readonly filesService = inject(FilesService);

  readonly files = signal<FileModel[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly previewingFile = signal<FileModel | null>(null);

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading.set(true);
    this.filesService.getFilesByEntity(this.entityType, this.entityId).subscribe({
      next: (files) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.loading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.uploading.set(true);
    this.uploadError.set(null);

    this.filesService.uploadFile(file, this.entityType, this.entityId).subscribe({
      next: () => {
        this.uploading.set(false);
        this.loadFiles();
        // Reset input
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message || 'Error al subir el archivo');
        input.value = '';
      },
    });
  }

  previewFile(file: FileModel): void {
    this.filesService.previewFile(file.id).subscribe({
      next: (url) => {
        this.previewUrl.set(url);
        this.previewingFile.set(file);
      },
      error: (err) => console.error('Error generating preview URL:', err),
    });
  }

  closePreview(): void {
    this.previewUrl.set(null);
    this.previewingFile.set(null);
  }

  downloadFile(file: FileModel): void {
    this.filesService.downloadFile(file.id).subscribe();
  }

  deleteFile(file: FileModel): void {
    if (!confirm(`¿Eliminar "${file.originalFilename}"?`)) {
      return;
    }

    this.filesService.deleteFile(file.id).subscribe({
      next: () => this.loadFiles(),
      error: (err) => alert('Error al eliminar: ' + (err.error?.message || 'Error desconocido')),
    });
  }

  getFileIcon(contentType: string): string {
    return this.filesService.getFileIcon(contentType);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  }
}
