import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { FilesService } from '../../core/services/files.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ClientsService } from '../../core/services/clients.service';
import { FileModel } from '../../core/models/file.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HasPermissionDirective],
  template: `
    <div class="space-y-6">
      <!-- Header con botón de carga -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Gestión Documental</h2>
          <p class="text-sm text-subtle">Control de archivos asociados a procesos y clientes.</p>
        </div>
        <button
          *hasPermission="['files.upload']"
          type="button"
          (click)="toggleUploadPanel()"
          class="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-hover"
        >
          @if (uploadPanelOpen()) {
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Cancelar
          } @else {
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Subir archivo
          }
        </button>
      </header>

      <!-- Panel de carga (colapsable y compacto) -->
      @if (uploadPanelOpen()) {
        <section class="rounded-md border border-default bg-gradient-to-br from-primary-tint to-surface p-4 shadow-card">
          <form [formGroup]="uploadForm" (ngSubmit)="handleUpload()" class="space-y-3">
            <!-- Row 1: Tipo + Entidad -->
            <div class="grid gap-3 md:grid-cols-3">
              <label class="text-sm font-medium text-text">
                Tipo
                <select
                  formControlName="entityType"
                  (change)="onEntityTypeChange()"
                  class="mt-1.5 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="legal_process">Proceso Legal</option>
                  <option value="client">Cliente</option>
                </select>
              </label>

              <label class="text-sm font-medium text-text md:col-span-2">
                {{ uploadForm.value.entityType === 'legal_process' ? 'Proceso' : 'Cliente' }}
                <select
                  formControlName="entityId"
                  class="mt-1.5 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccione...</option>
                  @if (uploadForm.value.entityType === 'legal_process') {
                    @for (process of processes(); track process.id) {
                      <option [value]="process.id">{{ process.title }}</option>
                    }
                  } @else {
                    @for (client of clients(); track client.id) {
                      <option [value]="client.id">{{ client.fullName }}</option>
                    }
                  }
                </select>
              </label>
            </div>

            <!-- Row 2: Archivo + Botón Subir -->
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
                        {{ formatFileSize(selectedFile()!.size) }}
                      } @else {
                        PDF, Word, Excel, imágenes
                      }
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  class="sr-only"
                  (change)="onFileSelected($event)"
                />
              </label>

              <button
                type="submit"
                [disabled]="uploadForm.invalid || !selectedFile() || isUploading()"
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

            <!-- Error -->
            @if (uploadError()) {
              <div class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
                {{ uploadError() }}
              </div>
            }
          </form>
        </section>
      }

      <!-- Lista de archivos (PRIORIDAD) -->
      <section *hasPermission="['files.view']" class="space-y-4">
        <!-- Filtros compactos -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-default bg-surface px-4 py-3">
          <div class="flex items-center gap-2 text-sm font-medium text-text">
            <svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span>{{ files().length }} archivo{{ files().length !== 1 ? 's' : '' }}</span>
          </div>

          <div class="flex gap-2">
            <select
              [(ngModel)]="filterEntityType"
              (change)="loadFiles()"
              class="rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos</option>
              <option value="legal_process">Procesos</option>
              <option value="client">Clientes</option>
            </select>

            <button
              (click)="loadFiles()"
              class="rounded-md border border-default px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface-muted"
              title="Actualizar"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Grid de archivos -->
        @if (loading()) {
          <div class="flex items-center justify-center rounded-lg border border-default bg-surface p-12">
            <svg class="h-8 w-8 animate-spin text-subtle" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
            </svg>
          </div>
        } @else if (files().length === 0) {
          <div class="rounded-lg border border-default bg-surface p-12 text-center">
            <svg class="mx-auto h-12 w-12 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p class="mt-4 text-sm font-medium text-text">No hay archivos</p>
            <p class="mt-1 text-sm text-subtle">Sube tu primer archivo para comenzar</p>
          </div>
        } @else {
          <div class="space-y-2">
            @for (file of files(); track file.id) {
              <div class="group rounded-md border border-default bg-surface p-4 shadow-card hover:shadow-card transition-all">
                <div class="flex items-center justify-between gap-4">
                  <!-- Info del archivo -->
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted flex-shrink-0">
                      <svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path [attr.d]="getFileIcon(file.contentType)" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-text truncate">{{ file.originalFilename }}</h3>
                      <div class="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-subtle">
                        <span class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5">
                          <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                          </svg>
                          {{ getEntityTypeLabel(file.entityType) }}
                        </span>
                        <span class="font-medium text-text">{{ getEntityName(file) }}</span>
                      </div>
                      <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-subtle">
                        <span>{{ file.formattedSize }}</span>
                        <span>•</span>
                        <span>{{ formatDate(file.createdAt) }}</span>
                        <span>•</span>
                        <span>{{ file.uploadedBy.email }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Acciones -->
                  <div class="flex items-center gap-1">
                    @if (file.isPreviewable) {
                      <button
                        (click)="previewFile(file)"
                        class="rounded-lg p-2 text-primary transition hover:bg-primary-tint"
                        title="Vista previa"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                    }

                    <button
                      (click)="downloadFile(file)"
                      class="rounded-lg p-2 text-success transition hover:bg-success-tint"
                      title="Descargar"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>

                    <button
                      *hasPermission="['files.delete']"
                      (click)="deleteFile(file)"
                      class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                      title="Eliminar"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>

    <!-- Modal de preview -->
    @if (previewUrl()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        (click)="closePreview()"
      >
        <div class="relative max-h-[90vh] max-w-6xl w-full overflow-auto rounded-lg bg-surface" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-default bg-surface px-6 py-4">
            <h3 class="text-lg font-semibold text-text">{{ previewingFile()?.originalFilename }}</h3>
            <button
              (click)="closePreview()"
              class="rounded-lg p-2 text-subtle transition hover:bg-surface-muted"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            @if (previewingFile()?.isImage) {
              <img [src]="previewUrl()!" [alt]="previewingFile()!.originalFilename" class="mx-auto max-w-full rounded-md" />
            } @else if (previewingFile()?.isPdf) {
              <iframe [src]="previewUrl()!" class="h-[70vh] w-full rounded-md border border-default"></iframe>
            } @else {
              <div class="flex flex-col items-center justify-center py-12">
                <svg class="h-16 w-16 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p class="mt-4 text-sm text-subtle">Vista previa no disponible</p>
                <button
                  (click)="downloadFile(previewingFile()!)"
                  class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Descargar archivo
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class DocumentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly filesService = inject(FilesService);
  private readonly processesService = inject(LegalProcessesService);
  private readonly clientsService = inject(ClientsService);

  // Signals
  readonly files = signal<FileModel[]>([]);
  readonly processes = signal<any[]>([]);
  readonly clients = signal<any[]>([]);
  readonly loading = signal(false);
  readonly isUploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewingFile = signal<FileModel | null>(null);
  readonly uploadPanelOpen = signal(false);

  // Filters
  filterEntityType = '';

  // Form
  readonly uploadForm = this.fb.nonNullable.group({
    entityType: ['legal_process', Validators.required],
    entityId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadInitialData();
    this.loadFiles();
  }

  private loadInitialData(): void {
    this.processesService.getLegalProcesses(1, 100).subscribe({
      next: (response) => this.processes.set(response.legalProcesses),
      error: (err) => console.error('Error loading processes:', err),
    });

    this.clientsService.getClients(1, 100).subscribe({
      next: (response) => this.clients.set(response.clients),
      error: (err) => console.error('Error loading clients:', err),
    });
  }

  loadFiles(): void {
    this.loading.set(true);
    const params = this.filterEntityType ? { entityType: this.filterEntityType } : {};
    
    this.filesService.listFiles(params).subscribe({
      next: (response) => {
        this.files.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.loading.set(false);
      },
    });
  }

  toggleUploadPanel(): void {
    this.uploadPanelOpen.update((open) => !open);
    if (!this.uploadPanelOpen()) {
      this.selectedFile.set(null);
      this.uploadError.set(null);
    }
  }

  onEntityTypeChange(): void {
    this.uploadForm.patchValue({ entityId: '' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
      this.uploadError.set(null);
    }
  }

  handleUpload(): void {
    if (this.uploadForm.invalid || !this.selectedFile()) {
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    const file = this.selectedFile()!;
    const formValue = this.uploadForm.getRawValue();

    this.filesService
      .uploadFile(file, formValue.entityType, formValue.entityId)
      .subscribe({
        next: () => {
          this.isUploading.set(false);
          this.selectedFile.set(null);
          this.uploadForm.reset({ entityType: 'legal_process', entityId: '' });
          this.uploadPanelOpen.set(false);
          this.loadFiles();
        },
        error: (err) => {
          this.isUploading.set(false);
          this.uploadError.set(err.error?.message || 'Error al subir el archivo');
        },
      });
  }

  previewFile(file: FileModel): void {
    this.filesService.previewFile(file.id).subscribe({
      next: (url) => {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.previewUrl.set(safeUrl);
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
    this.filesService.downloadFile(file.id).subscribe({
      next: () => {
        // Descarga iniciada correctamente
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        alert('Error al descargar el archivo');
      },
    });
  }

  deleteFile(file: FileModel): void {
    if (!confirm(`¿Eliminar "${file.originalFilename}"?`)) {
      return;
    }

    this.filesService.deleteFile(file.id).subscribe({
      next: () => this.loadFiles(),
      error: (err) => alert('Error al eliminar: ' + err.error?.message),
    });
  }

  getFileIcon(contentType: string): string {
    return this.filesService.getFileIcon(contentType);
  }

  formatFileSize(bytes: number): string {
    return this.filesService.formatFileSize(bytes);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtiene el nombre de la entidad (proceso o cliente) asociada al archivo
   */
  getEntityName(file: FileModel): string {
    if (file.entityType === 'legal_process') {
      const process = this.processes().find(p => p.id === file.entityId);
      return process ? process.title : 'Proceso no encontrado';
    } else if (file.entityType === 'client') {
      const client = this.clients().find(c => c.id === file.entityId);
      return client ? client.fullName : 'Cliente no encontrado';
    }
    return 'Entidad desconocida';
  }

  /**
   * Obtiene el tipo de entidad en español
   */
  getEntityTypeLabel(entityType: string): string {
    const labels: Record<string, string> = {
      legal_process: 'Proceso Legal',
      client: 'Cliente',
      document: 'Documento',
      annotation: 'Anotación',
    };
    return labels[entityType] || entityType;
  }
}