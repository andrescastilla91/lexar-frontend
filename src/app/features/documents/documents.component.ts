import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FilesService } from '../../core/services/files.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ClientsService } from '../../core/services/clients.service';
import { FileModel } from '../../core/models/file.model';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PermissionsService } from '../../core/services/permissions.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { FilePreviewModalComponent } from '../../core/components/file-preview-modal.component';
import { DocumentUploadPanelComponent } from './components/document-upload-panel.component';
import { DocumentsListComponent, DocumentRow } from './components/documents-list.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HasPermissionDirective,
    DocumentUploadPanelComponent,
    DocumentsListComponent,
    FilePreviewModalComponent,
  ],
  template: `
    <div class="space-y-6">
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

      <app-document-upload-panel
        [form]="uploadForm"
        [isOpen]="uploadPanelOpen()"
        [selectedFile]="selectedFile()"
        [selectedFileSizeLabel]="selectedFileSizeLabel()"
        [isUploading]="isUploading()"
        [uploadError]="uploadError()"
        [processes]="processOptions()"
        [clients]="clientOptions()"
        (entityTypeChange)="onEntityTypeChange()"
        (fileSelected)="onFileSelected($event)"
        (submit)="handleUpload()"
      />

      <app-documents-list
        [files]="documentRows()"
        [isLoading]="loading()"
        [filterEntityType]="filterEntityType()"
        [hasFullAccess]="hasFullDocumentAccess()"
        [onlyMine]="onlyMine()"
        (filterChange)="onFilterChange($event)"
        (onlyMineChange)="onOnlyMineChange($event)"
        (refresh)="loadFiles()"
        (previewFile)="previewFile($event)"
        (downloadFile)="downloadFile($event)"
        (deleteFile)="deleteFile($event)"
      />
    </div>

    <app-file-preview-modal
      [file]="previewingFile()"
      [url]="previewUrl()"
      (close)="closePreview()"
      (download)="downloadFile(previewingFile()!)"
    />
  `,
})
export class DocumentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly filesService = inject(FilesService);
  private readonly processesService = inject(LegalProcessesService);
  private readonly clientsService = inject(ClientsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly toast = inject(ToastService);

  readonly files = signal<FileModel[]>([]);
  readonly processes = signal<{ id: string; title: string }[]>([]);
  readonly clients = signal<{ id: string; fullName: string }[]>([]);
  readonly loading = signal(false);
  readonly isUploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewingFile = signal<FileModel | null>(null);
  readonly uploadPanelOpen = signal(false);
  readonly filterEntityType = signal('');
  /** F30: filtro "Solo los míos" — solo tiene efecto real para quien tiene
   * files.view.all (ver hasFullDocumentAccess). */
  readonly onlyMine = signal(false);

  readonly hasFullDocumentAccess = computed(() =>
    this.permissionsService.hasPermission('files.view.all'),
  );

  readonly uploadForm = this.fb.nonNullable.group({
    entityType: ['legal_process', Validators.required],
    entityId: ['', Validators.required],
  });

  readonly processOptions = computed(() =>
    this.processes().map((process) => ({ id: process.id, label: process.title }))
  );

  readonly clientOptions = computed(() =>
    this.clients().map((client) => ({ id: client.id, label: client.fullName }))
  );

  readonly selectedFileSizeLabel = computed(() => {
    const file = this.selectedFile();
    return file ? this.filesService.formatFileSize(file.size) : '';
  });

  readonly documentRows = computed<DocumentRow[]>(() =>
    this.files().map((file) => ({
      ...file,
      iconPath: this.filesService.getFileIcon(file.contentType),
      entityName: this.getEntityName(file),
      entityTypeLabel: this.getEntityTypeLabel(file.entityType),
      formattedDate: this.formatDate(file.createdAt),
    }))
  );

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
    const params = {
      ...(this.filterEntityType() ? { entityType: this.filterEntityType() } : {}),
      ...(this.onlyMine() ? { onlyMine: true } : {}),
    };

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

  onFilterChange(entityType: string): void {
    this.filterEntityType.set(entityType);
    this.loadFiles();
  }

  onOnlyMineChange(onlyMine: boolean): void {
    this.onlyMine.set(onlyMine);
    this.loadFiles();
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

  onFileSelected(file: File): void {
    this.selectedFile.set(file);
    this.uploadError.set(null);
  }

  handleUpload(): void {
    if (this.isUploading()) {
      return;
    }

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
          // BUG-20 ola 1: err.message ya es el mensaje real y seguro que
          // calculó error.interceptor.ts (BUG-19) — err.error?.message lee
          // el body crudo, sin sus reglas de seguridad (p. ej. un 500 nunca
          // confía en el body).
          this.isUploading.set(false);
          const message = err.message || 'Error al subir el archivo';
          this.uploadError.set(message);
          this.toast.error(message);
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
        // BUG-20 ola 1: alert() nativo reemplazado por ToastService; se lee
        // err.message (el mensaje real y seguro del interceptor) en vez de
        // un texto hardcodeado que ocultaba el motivo real del fallo.
        this.toast.error(err.message || 'Error al descargar el archivo');
      },
    });
  }

  async deleteFile(file: FileModel): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar documento',
      message: `¿Eliminar "${file.originalFilename}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.filesService.deleteFile(file.id).subscribe({
      next: () => this.loadFiles(),
      error: (err) => {
        // BUG-20 ola 1: alert() nativo reemplazado por ToastService; se lee
        // err.message en vez de err.error?.message (ver comentario en
        // handleUpload).
        this.toast.error(err.message || 'Error al eliminar el documento');
      },
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getEntityName(file: FileModel): string {
    if (file.entityType === 'legal_process') {
      const process = this.processes().find((p) => p.id === file.entityId);
      return process ? process.title : 'Proceso no encontrado';
    } else if (file.entityType === 'client') {
      const client = this.clients().find((c) => c.id === file.entityId);
      return client ? client.fullName : 'Cliente no encontrado';
    }
    return 'Entidad desconocida';
  }

  private getEntityTypeLabel(entityType: string): string {
    const labels: Record<string, string> = {
      legal_process: 'Proceso Legal',
      client: 'Cliente',
      document: 'Documento',
      annotation: 'Anotación',
    };
    return labels[entityType] || entityType;
  }
}
