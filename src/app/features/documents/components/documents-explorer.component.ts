import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FilesService } from '../../../core/services/files.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { FilePreviewModalComponent } from '../../../core/components/file-preview-modal.component';
import { FileAuditHistoryModalComponent } from '../../../core/components/file-audit-history-modal.component';
import {
  DocumentTreeClientNode,
  DocumentTreeGroupNode,
  DocumentTreeTypeNode,
  FileModel,
  FileAuditLogEntry,
} from '../../../core/models/file.model';

type ExplorerLevel = 0 | 1 | 2 | 3 | 4;

interface Breadcrumb {
  label: string;
  level: ExplorerLevel;
}

const NODE_KIND_LABEL: Record<DocumentTreeGroupNode['kind'], string> = {
  matter: 'Asunto',
  process: 'Proceso',
  general: 'General',
};

// Heroicons v2 outline "folder" — usado para los 3 niveles de navegación
// (cliente, asunto/proceso, tipo documental); el nivel de documentos usa el
// ícono por tipo de archivo (ver FilesService.getFileIcon), no este.
const FOLDER_ICON_PATH =
  'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0v6a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-6m-19.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h4.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12a1.5 1.5 0 0 0 1.06.44H19.5a2.25 2.25 0 0 1 2.25 2.25v3.75';

/**
 * F37 §DOC-01 (ola 2) — explorador de documentos: navegación por niveles
 * Cliente → Asunto/Proceso → tipo documental → documentos, con migas de
 * pan. Es una jerarquía DE NAVEGACIÓN (F37.md §2): cada nivel es una
 * consulta al árbol (`DocumentsTreeService` en el backend), no hay
 * carpetas reales. Los 3 primeros niveles se muestran como cards con
 * ícono de carpeta; el nivel de documentos sigue siendo una lista de
 * archivos (no son "carpetas").
 *
 * F37 §DOC-02 (ola 3) — agrega la bandeja "Sin clasificar": un card
 * especial en el nivel 0 (solo visible si hay archivos pendientes) que
 * navega a una lista plana con acción inline para completar el tipo
 * documental de cada archivo (`FilesService.classifyDocumentType`).
 *
 * Componente autocontenido (mismo patrón que `EntityFilesComponent`): trae
 * sus propios datos, maneja su propio modal de vista previa y sus propias
 * acciones de descarga/eliminación — `DocumentsComponent` solo decide qué
 * vista mostrar (explorador vs. tabla plana), no orquesta su estado.
 */
@Component({
  selector: 'app-documents-explorer',
  standalone: true,
  imports: [FilePreviewModalComponent, FileAuditHistoryModalComponent],
  template: `
    <div class="space-y-4">
      <!-- Migas de pan -->
      <nav class="flex flex-wrap items-center gap-1 text-sm text-subtle" aria-label="Miga de pan">
        @for (crumb of breadcrumbs(); track crumb.level; let last = $last) {
          <button
            type="button"
            (click)="goToLevel(crumb.level)"
            [disabled]="last"
            class="rounded px-1.5 py-0.5 transition"
            [class.font-semibold]="last"
            [class.text-text]="last"
            [class.hover:bg-surface-muted]="!last"
            [class.hover:text-text]="!last"
          >
            {{ crumb.label }}
          </button>
          @if (!last) {
            <svg class="h-3.5 w-3.5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          }
        }
      </nav>

      @if (loading()) {
        <div class="flex justify-center py-10">
          <svg class="h-6 w-6 animate-spin text-subtle" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
          </svg>
        </div>
      } @else if (level() === 0) {
        @if (clients().length === 0 && unclassifiedTotal() === 0) {
          <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
            Sin documentos clasificados todavía. Los archivos cargados sin cliente, asunto o tipo asignado no aparecen aquí.
          </p>
        } @else {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @if (unclassifiedTotal() > 0) {
              <button
                type="button"
                (click)="openUnclassifiedTray()"
                class="flex items-center gap-3 rounded-lg border border-warning bg-warning-tint px-4 py-3.5 text-left transition hover:shadow-card"
              >
                <svg class="h-9 w-9 flex-shrink-0 text-warning" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-text">Sin clasificar</span>
                  <span class="block text-xs text-subtle">{{ unclassifiedTotal() }} documento{{ unclassifiedTotal() === 1 ? '' : 's' }} por completar</span>
                </span>
              </button>
            }
            @for (client of clients(); track client.id) {
              <button
                type="button"
                (click)="selectClient(client)"
                class="flex items-center gap-3 rounded-lg border border-default bg-surface px-4 py-3.5 text-left transition hover:border-strong hover:shadow-card"
              >
                <svg class="h-9 w-9 flex-shrink-0 text-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="folderIconPath" />
                </svg>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-text">{{ client.label }}</span>
                  <span class="block text-xs text-subtle">{{ client.documentCount }} documento{{ client.documentCount === 1 ? '' : 's' }}</span>
                </span>
              </button>
            }
          </div>
        }
      } @else if (level() === 1) {
        @if (nodes().length === 0) {
          <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
            Este cliente no tiene asuntos ni procesos con documentos clasificados.
          </p>
        } @else {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (node of nodes(); track (node.id ?? 'general')) {
              <button
                type="button"
                (click)="selectNode(node)"
                class="flex items-center gap-3 rounded-lg border border-default bg-surface px-4 py-3.5 text-left transition hover:border-strong hover:shadow-card"
              >
                <svg class="h-9 w-9 flex-shrink-0 text-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="folderIconPath" />
                </svg>
                <span class="min-w-0">
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-medium text-info">
                      {{ nodeKindLabel(node) }}
                    </span>
                    <span class="truncate text-sm font-medium text-text">{{ node.label }}</span>
                  </span>
                  <span class="block text-xs text-subtle">{{ node.documentCount }} documento{{ node.documentCount === 1 ? '' : 's' }}</span>
                </span>
              </button>
            }
          </div>
        }
      } @else if (level() === 2) {
        @if (types().length === 0) {
          <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
            Sin documentos en este nodo.
          </p>
        } @else {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (type of types(); track type.documentTypeId) {
              <button
                type="button"
                (click)="selectType(type)"
                class="flex items-center gap-3 rounded-lg border border-default bg-surface px-4 py-3.5 text-left transition hover:border-strong hover:shadow-card"
              >
                <svg class="h-9 w-9 flex-shrink-0 text-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="folderIconPath" />
                </svg>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-text">{{ type.label }}</span>
                  <span class="block text-xs text-subtle">{{ type.documentCount }} documento{{ type.documentCount === 1 ? '' : 's' }}</span>
                </span>
              </button>
            }
          </div>
        }
      } @else if (level() === 3) {
        @if (documents().length === 0) {
          <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
            Sin documentos.
          </p>
        } @else {
          <div class="space-y-2">
            @for (file of documents(); track file.id) {
              <div class="group flex items-center justify-between rounded-md border border-default bg-surface px-4 py-3 transition hover:border-strong hover:shadow-card">
                <div class="flex min-w-0 items-center gap-3">
                  <svg class="h-5 w-5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path [attr.d]="filesService.getFileIcon(file.contentType)" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-text">{{ file.originalFilename }}</p>
                    <p class="text-xs text-subtle">{{ file.formattedSize }} • {{ formatDate(file.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  @if (file.isPreviewable) {
                    <button type="button" (click)="previewFile(file)" class="rounded-lg p-1.5 text-primary transition hover:bg-primary-tint" title="Vista previa">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </button>
                  }
                  <button type="button" (click)="openAuditHistory(file)" class="rounded-lg p-1.5 text-subtle transition hover:bg-surface-muted hover:text-text" title="Historial de auditoría">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                  <button type="button" (click)="downloadFile(file)" class="rounded-lg p-1.5 text-success transition hover:bg-success-tint" title="Descargar">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>
                  <button type="button" (click)="deleteFile(file)" class="rounded-lg p-1.5 text-danger transition hover:bg-danger-tint" title="Eliminar">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- Nivel 4: bandeja "Sin clasificar" (F37 §DOC-02, ola 3) -->
        @if (unclassifiedDocuments().length === 0) {
          <p class="rounded-md border-2 border-dashed border-default bg-surface-muted py-8 text-center text-sm text-subtle">
            No hay documentos pendientes de clasificar.
          </p>
        } @else {
          <div class="space-y-2">
            @for (file of unclassifiedDocuments(); track file.id) {
              <div class="flex flex-col gap-3 rounded-md border border-default bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                  <svg class="h-5 w-5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path [attr.d]="filesService.getFileIcon(file.contentType)" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-text">{{ file.originalFilename }}</p>
                    <p class="text-xs text-subtle">{{ file.formattedSize }} • {{ formatDate(file.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <button type="button" (click)="openAuditHistory(file)" class="rounded-lg p-1.5 text-subtle transition hover:bg-surface-muted hover:text-text" title="Historial de auditoría">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                  <select
                    class="rounded-md border border-default bg-surface px-2 py-1.5 text-sm text-text"
                    [value]="pendingDocumentTypeId()[file.id] ?? ''"
                    (change)="onDocumentTypeSelected(file.id, $any($event.target).value)"
                  >
                    <option value="" disabled>Tipo de documento…</option>
                    @for (docType of documentTypeOptions(); track docType.id) {
                      <option [value]="docType.id">{{ docType.label }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    (click)="saveClassification(file)"
                    [disabled]="!pendingDocumentTypeId()[file.id] || savingFileId() === file.id"
                    class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-strong"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>

    <app-file-preview-modal
      [file]="previewingFile()"
      [url]="previewUrl()"
      (close)="closePreview()"
      (download)="downloadFile(previewingFile()!)"
    />

    <app-file-audit-history-modal
      [file]="auditHistoryFile()"
      [entries]="auditHistoryEntries()"
      [loading]="auditHistoryLoading()"
      (close)="closeAuditHistory()"
    />
  `,
})
export class DocumentsExplorerComponent implements OnInit {
  readonly filesService = inject(FilesService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);

  readonly folderIconPath = FOLDER_ICON_PATH;

  readonly level = signal<ExplorerLevel>(0);
  readonly loading = signal(false);

  readonly clients = signal<DocumentTreeClientNode[]>([]);
  readonly nodes = signal<DocumentTreeGroupNode[]>([]);
  readonly types = signal<DocumentTreeTypeNode[]>([]);
  readonly documents = signal<FileModel[]>([]);

  // F37 §DOC-02 (ola 3) — bandeja "Sin clasificar".
  readonly unclassifiedTotal = signal(0);
  readonly unclassifiedDocuments = signal<FileModel[]>([]);
  readonly documentTypeOptions = signal<{ id: string; label: string }[]>([]);
  readonly pendingDocumentTypeId = signal<Record<string, string>>({});
  readonly savingFileId = signal<string | null>(null);

  readonly selectedClient = signal<DocumentTreeClientNode | null>(null);
  readonly selectedNode = signal<DocumentTreeGroupNode | null>(null);
  readonly selectedType = signal<DocumentTreeTypeNode | null>(null);

  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewingFile = signal<FileModel | null>(null);

  // F37 §DOC-06 (ola 4) — historial de auditoría de un documento (ficha).
  readonly auditHistoryFile = signal<FileModel | null>(null);
  readonly auditHistoryEntries = signal<FileAuditLogEntry[]>([]);
  readonly auditHistoryLoading = signal(false);

  readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const crumbs: Breadcrumb[] = [{ label: 'Clientes', level: 0 }];
    if (this.level() === 4) {
      crumbs.push({ label: 'Sin clasificar', level: 4 });
      return crumbs;
    }
    const client = this.selectedClient();
    if (client) {
      crumbs.push({ label: client.label, level: 1 });
    }
    const node = this.selectedNode();
    if (node) {
      crumbs.push({ label: node.label, level: 2 });
    }
    const type = this.selectedType();
    if (type) {
      crumbs.push({ label: type.label, level: 3 });
    }
    return crumbs;
  });

  ngOnInit(): void {
    this.loadClients();
    this.loadUnclassifiedTotal();
    this.catalogsService.getActiveCatalog('case_document_type').subscribe({
      next: (items) =>
        this.documentTypeOptions.set(items.map((item) => ({ id: item.id, label: item.label }))),
      error: (err) => console.error('Error loading document types:', err),
    });
  }

  nodeKindLabel(node: DocumentTreeGroupNode): string {
    return NODE_KIND_LABEL[node.kind];
  }

  loadClients(): void {
    this.loading.set(true);
    this.filesService.getDocumentTreeClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.level.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading document tree clients:', err);
        this.loading.set(false);
      },
    });
  }

  private loadUnclassifiedTotal(): void {
    this.filesService.getDocumentTreeUnclassified(1, 1).subscribe({
      next: (response) => this.unclassifiedTotal.set(response.total),
      error: (err) => console.error('Error loading unclassified total:', err),
    });
  }

  openUnclassifiedTray(): void {
    this.selectedClient.set(null);
    this.selectedNode.set(null);
    this.selectedType.set(null);
    this.loadUnclassified();
  }

  private loadUnclassified(): void {
    this.loading.set(true);
    this.filesService.getDocumentTreeUnclassified(1, 100).subscribe({
      next: (response) => {
        this.unclassifiedDocuments.set(response.data);
        this.unclassifiedTotal.set(response.total);
        this.level.set(4);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading unclassified documents:', err);
        this.loading.set(false);
      },
    });
  }

  onDocumentTypeSelected(fileId: string, documentTypeId: string): void {
    this.pendingDocumentTypeId.update((current) => ({ ...current, [fileId]: documentTypeId }));
  }

  saveClassification(file: FileModel): void {
    const documentTypeId = this.pendingDocumentTypeId()[file.id];
    if (!documentTypeId) {
      return;
    }
    this.savingFileId.set(file.id);
    this.filesService.classifyDocumentType(file.id, documentTypeId).subscribe({
      next: () => {
        this.unclassifiedDocuments.update((files) => files.filter((f) => f.id !== file.id));
        this.unclassifiedTotal.update((total) => Math.max(0, total - 1));
        this.pendingDocumentTypeId.update((current) => {
          const { [file.id]: _removed, ...rest } = current;
          return rest;
        });
        this.savingFileId.set(null);
        this.toast.success('Documento clasificado');
      },
      error: (err) => {
        this.savingFileId.set(null);
        this.toast.error(err.message || 'Error al clasificar el documento');
      },
    });
  }

  selectClient(client: DocumentTreeClientNode): void {
    this.selectedClient.set(client);
    this.selectedNode.set(null);
    this.selectedType.set(null);
    this.loadNodes(client.id);
  }

  private loadNodes(clientId: string): void {
    this.loading.set(true);
    this.filesService.getDocumentTreeClientNodes(clientId).subscribe({
      next: (nodes) => {
        this.nodes.set(nodes);
        this.level.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading document tree nodes:', err);
        this.loading.set(false);
      },
    });
  }

  selectNode(node: DocumentTreeGroupNode): void {
    this.selectedNode.set(node);
    this.selectedType.set(null);
    this.loadTypes();
  }

  private loadTypes(): void {
    const clientId = this.selectedClient()?.id;
    if (!clientId) {
      return;
    }
    const node = this.selectedNode();
    const matterId = node?.kind === 'matter' ? node.id ?? undefined : undefined;
    const processId = node?.kind === 'process' ? node.id ?? undefined : undefined;

    this.loading.set(true);
    this.filesService.getDocumentTreeTypes(clientId, matterId, processId).subscribe({
      next: (types) => {
        this.types.set(types);
        this.level.set(2);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading document tree types:', err);
        this.loading.set(false);
      },
    });
  }

  selectType(type: DocumentTreeTypeNode): void {
    this.selectedType.set(type);
    this.loadDocuments();
  }

  private loadDocuments(): void {
    const clientId = this.selectedClient()?.id;
    const documentTypeId = this.selectedType()?.documentTypeId;
    if (!clientId || !documentTypeId) {
      return;
    }
    const node = this.selectedNode();
    const matterId = node?.kind === 'matter' ? node.id ?? undefined : undefined;
    const processId = node?.kind === 'process' ? node.id ?? undefined : undefined;

    this.loading.set(true);
    this.filesService
      .getDocumentTreeDocuments(clientId, documentTypeId, matterId, processId)
      .subscribe({
        next: (response) => {
          this.documents.set(response.data);
          this.level.set(3);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading document tree documents:', err);
          this.loading.set(false);
        },
      });
  }

  goToLevel(target: ExplorerLevel): void {
    if (target === this.level()) {
      return;
    }
    if (target === 0) {
      this.selectedClient.set(null);
      this.selectedNode.set(null);
      this.selectedType.set(null);
      this.loadClients();
      this.loadUnclassifiedTotal();
    } else if (target === 1) {
      this.selectedNode.set(null);
      this.selectedType.set(null);
      const clientId = this.selectedClient()?.id;
      if (clientId) {
        this.loadNodes(clientId);
      }
    } else if (target === 2) {
      this.selectedType.set(null);
      this.loadTypes();
    }
  }

  previewFile(file: FileModel): void {
    this.filesService.previewFile(file.id).subscribe({
      next: (url) => {
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.previewingFile.set(file);
      },
      error: (err) => console.error('Error generating preview URL:', err),
    });
  }

  closePreview(): void {
    this.previewUrl.set(null);
    this.previewingFile.set(null);
  }

  openAuditHistory(file: FileModel): void {
    this.auditHistoryFile.set(file);
    this.auditHistoryLoading.set(true);
    this.auditHistoryEntries.set([]);
    this.filesService.getAuditHistory(file.id).subscribe({
      next: (res) => {
        this.auditHistoryEntries.set(res.data);
        this.auditHistoryLoading.set(false);
      },
      error: (err) => {
        this.auditHistoryLoading.set(false);
        this.toast.error(err.message || 'Error al obtener el historial del documento');
      },
    });
  }

  closeAuditHistory(): void {
    this.auditHistoryFile.set(null);
    this.auditHistoryEntries.set([]);
  }

  downloadFile(file: FileModel): void {
    this.filesService.downloadFile(file.id).subscribe();
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
      next: () => this.loadDocuments(),
      error: (err) => {
        this.toast.error(err.message || 'Error al eliminar el documento');
      },
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
