import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ProcessEventsService } from '../../core/services/process-events.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ClientsService } from '../../core/services/clients.service';
import { FilesService } from '../../core/services/files.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { ClientResponse } from '../../core/models/client-backend.model';
import { CatalogsService } from '../../core/services/catalogs.service';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import { PaginationComponent } from '../../core/components/pagination.component';
import { FilePreviewModalComponent } from '../../core/components/file-preview-modal.component';
import { forkJoin, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  LegalProcessResponse,
  ProcessStatus,
  CreateLegalProcessRequest,
  UpdateLegalProcessRequest,
  UpdateProcessStatusRequest,
} from '../../core/models/legal-process.model';
import { ProcessEvent } from '../../core/models/process-event.model';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ProcessesTableComponent } from './components/processes-table.component';
import { ProcessFormComponent } from './components/process-form.component';
import { ProcessStatusModalComponent } from './components/process-status-modal.component';
import { ProcessAnnotationModalComponent } from './components/process-annotation-modal.component';
import { ProcessHistoryModalComponent } from './components/process-history-modal.component';
import { getStatusLabel, getValidNextStatuses, isProcessEditable } from './utils/process-format.utils';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PaginationComponent,
    ProcessesTableComponent,
    ProcessFormComponent,
    ProcessStatusModalComponent,
    ProcessAnnotationModalComponent,
    ProcessHistoryModalComponent,
    FilePreviewModalComponent,
  ],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Procesos judiciales y administrativos</h2>
          <p class="text-sm text-subtle">Monitorea etapas, responsables y niveles de riesgo procesal.</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo proceso
        </button>
      </header>

      <!-- Filters Panel -->
      <section class="relative grid gap-6">
        <form
          class="grid gap-4 rounded-lg border border-default bg-surface p-6 shadow-card"
          [formGroup]="filterForm"
          (ngSubmit)="applyFilters()"
        >
          <div class="grid gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-2 text-sm text-muted md:col-span-2">
              Búsqueda
              <input
                formControlName="search"
                type="search"
                placeholder="Título, número de caso, descripción"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-muted">
              Estado
              <select
                formControlName="status"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                <option [value]="ProcessStatus.DRAFT">Borrador</option>
                <option [value]="ProcessStatus.ACTIVE">Activo</option>
                <option [value]="ProcessStatus.UNDER_REVIEW">En Revisión</option>
                <option [value]="ProcessStatus.SUSPENDED">Suspendido</option>
                <option [value]="ProcessStatus.COMPLETED">Completado</option>
                <option [value]="ProcessStatus.CANCELLED">Cancelado</option>
                <option [value]="ProcessStatus.ARCHIVED">Archivado</option>
              </select>
            </label>
            <label class="flex flex-col gap-2 text-sm text-muted">
              Cliente
              <select
                formControlName="clientId"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                @for (client of clients(); track client.id) {
                  <option [value]="client.id">{{ client.fullName }}</option>
                }
              </select>
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              (click)="resetFilters()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <!-- Create/Edit Form Modal -->
      <app-process-form
        [form]="processForm"
        [isOpen]="panelOpen()"
        [isEditing]="!!editingProcess()"
        [isSubmitting]="isLoading()"
        [errorMessage]="formError()"
        [statusMessage]="processStatusMessage()"
        [canEdit]="canEditProcess()"
        [clients]="clients()"
        [advisors]="advisors()"
        [stages]="stages()"
        [riskLevels]="riskLevels()"
        (close)="togglePanel()"
        (submit)="submitProcess()"
        (toggleAdvisor)="toggleAdvisor($event)"
        (generateCaseNumber)="generateCaseNumber()"
      />

      <!-- Status Update Modal (HU-14) -->
      <app-process-status-modal
        [form]="statusForm"
        [isOpen]="statusModalOpen()"
        [isSubmitting]="isLoading()"
        [errorMessage]="formError()"
        [validNextStatuses]="validNextStatuses()"
        (close)="closeStatusModal()"
        (submit)="updateStatus()"
      />

      <!-- HU-17: History Modal -->
      <app-process-history-modal
        [isOpen]="historyModalOpen()"
        [processTitle]="editingProcess()?.title ?? null"
        [isLoadingHistory]="isLoadingHistory()"
        [events]="processHistory()"
        (close)="closeHistoryModal()"
        (previewFile)="previewFileFromHistory($event.fileId, $event.filename)"
        (downloadFile)="downloadFile($event)"
      />

      <!-- File Preview Modal -->
      <app-file-preview-modal
        [file]="previewingFile()"
        [url]="previewUrl()"
        (close)="closePreviewModal()"
        (download)="downloadFile(previewingFile()!.id)"
      />

      <!-- HU-16: Annotation Modal -->
      <app-process-annotation-modal
        [form]="annotationForm"
        [isOpen]="annotationModalOpen()"
        [isSubmitting]="isLoading()"
        [errorMessage]="formError()"
        [processTitle]="editingProcess()?.title ?? null"
        [files]="annotationFiles()"
        (close)="closeAnnotationModal()"
        (submit)="submitAnnotation()"
        (filesSelected)="onAnnotationFilesSelected($event)"
        (removeFile)="removeAnnotationFile($event)"
      />

      <!-- Data Table -->
      <app-processes-table
        [processes]="processes()"
        [isLoading]="isLoading()"
        (edit)="editProcess($event)"
        (changeStatus)="openStatusModal($event)"
        (viewHistory)="openHistoryModal($event)"
        (annotate)="openAnnotationModal($event)"
        (delete)="deleteProcess($event)"
      />

      <!-- Paginación -->
      @if (totalItems() > 0) {
        <app-pagination
          [total]="totalItems()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize"
          [currentItems]="processes().length"
          [totalPages]="totalPages()"
          [itemLabel]="'procesos'"
          (nextPage)="nextPage()"
          (previousPage)="previousPage()"
        />
      }
    </div>
  `,
})
export class ProcessesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly processEventsService = inject(ProcessEventsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly filesService = inject(FilesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private fileDeletedSubscription?: Subscription;

  // Exposed enums for template
  readonly ProcessStatus = ProcessStatus;

  // Signal state
  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly clients = signal<ClientResponse[]>([]);
  readonly stages = signal<CatalogItem[]>([]);
  readonly riskLevels = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly statusModalOpen = signal(false);
  readonly historyModalOpen = signal(false); // HU-17
  readonly annotationModalOpen = signal(false); // HU-16
  readonly annotationFiles = signal<File[]>([]); // HU-16 - Archivos para adjuntar a anotación
  readonly editingProcess = signal<LegalProcessResponse | null>(null);
  readonly processHistory = signal<ProcessEvent[]>([]); // HU-17
  readonly isLoadingHistory = signal(false); // HU-17
  readonly previewingFile = signal<{ id: string; originalFilename: string; isImage: boolean; isPdf: boolean } | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly currentPage = signal(1);
  readonly totalItems = signal(0);

  // Computed signals
  readonly validNextStatuses = computed(() => {
    const process = this.editingProcess();
    return process ? getValidNextStatuses(process.status) : [];
  });

  readonly canEditProcess = computed(() => {
    const process = this.editingProcess();
    if (!process) return true; // Nuevo proceso, siempre editable
    return isProcessEditable(process.status);
  });

  readonly processStatusMessage = computed(() => {
    const process = this.editingProcess();
    if (!process) return null;

    switch (process.status) {
      case ProcessStatus.COMPLETED:
        return 'Este proceso está completado. No se pueden realizar cambios.';
      case ProcessStatus.CANCELLED:
        return 'Este proceso está cancelado. No se pueden realizar cambios.';
      case ProcessStatus.ARCHIVED:
        return 'Este proceso está archivado. No se pueden realizar cambios.';
      case ProcessStatus.ACTIVE:
        return 'El número de caso y el cliente no pueden modificarse una vez el proceso está activo.';
      case ProcessStatus.UNDER_REVIEW:
        return 'El proceso está en revisión. Algunas modificaciones están restringidas.';
      case ProcessStatus.SUSPENDED:
        return 'El proceso está suspendido. La etapa no puede modificarse.';
      default:
        return null;
    }
  });

  readonly pageSize = 10;

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  // Forms
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: [null as ProcessStatus | null],
    clientId: [null as string | null],
  });

  readonly processForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    clientId: ['', [Validators.required]],
    advisorIds: [[] as string[], []],
    status: [ProcessStatus.DRAFT, [Validators.required]],
    stageId: ['', [Validators.required]],
    riskLevelId: ['', [Validators.required]],
    court: [''],
    caseNumber: [''],
    startDate: [''],
    nextHearingDate: [''],
    endDate: [''],
  });

  readonly statusForm = this.fb.nonNullable.group({
    status: [ProcessStatus.DRAFT, [Validators.required]],
    notes: [''],
  });

  // HU-16: Formulario de anotación
  readonly annotationForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    this.loadProcesses();
    this.loadAdvisors();
    this.loadClients();
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    this.catalogsService.getActiveCatalog('process_stage').subscribe((items) => this.stages.set(items));
    this.catalogsService.getActiveCatalog('risk_level').subscribe((items) => this.riskLevels.set(items));
  }

  loadProcesses(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();

    this.legalProcessesService
      .getLegalProcesses(this.currentPage(), this.pageSize, {
        status: filters.status || undefined,
        clientId: filters.clientId || undefined,
        search: filters.search || undefined,
      })
      .subscribe({
        next: (response) => {
          this.processes.set(response.legalProcesses);
          this.totalItems.set(response.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading processes:', error);
          this.formError.set('Error al cargar procesos');
          this.isLoading.set(false);
        },
      });
  }

  loadAdvisors(): void {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => {
        this.advisors.set(response.advisors);
      },
      error: (error) => console.error('Error loading advisors:', error),
    });
  }

  loadClients(): void {
    this.clientsService.getClients(1, 100).subscribe({
      next: (response) => {
        this.clients.set(response.clients);
      },
      error: (error) => console.error('Error loading clients:', error),
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadProcesses();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: null,
      clientId: null,
    });
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadProcesses();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadProcesses();
    }
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.panelOpen.set(false);
      this.editingProcess.set(null);
      this.processForm.reset({
        title: '',
        description: '',
        clientId: '',
        advisorIds: [],
        status: ProcessStatus.DRAFT,
        stageId: '',
        riskLevelId: '',
        court: '',
        caseNumber: '',
        startDate: '',
        nextHearingDate: '',
        endDate: '',
      });
      // Habilitar todos los campos para nuevo proceso
      Object.keys(this.processForm.controls).forEach((key) => {
        this.processForm.get(key)?.enable();
      });
      this.formError.set(null);
    } else {
      this.panelOpen.set(true);
    }
  }

  submitProcess(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.processForm.invalid) {
      this.processForm.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.isLoading.set(true);
    this.formError.set(null);
    const formValue = this.processForm.getRawValue();

    // Prepare request
    const baseRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      stageId: formValue.stageId || undefined,
      riskLevelId: formValue.riskLevelId || undefined,
      court: formValue.court || undefined,
      caseNumber: formValue.caseNumber || undefined,
      startDate: formValue.startDate || undefined,
      nextHearingDate: formValue.nextHearingDate || undefined,
      endDate: formValue.endDate || undefined,
      clientId: formValue.clientId,
      // Se envía siempre el array real: omitirlo cuando queda vacío hace que el backend nunca toque la relación.
      advisorIds: formValue.advisorIds,
    };

    // El estado solo se incluye al crear (siempre DRAFT)
    // Al editar, el estado se cambia mediante el modal dedicado
    const request: CreateLegalProcessRequest | UpdateLegalProcessRequest = this.editingProcess()
      ? baseRequest
      : { ...baseRequest, status: ProcessStatus.DRAFT };

    const operation = this.editingProcess()
      ? this.legalProcessesService.updateLegalProcess(this.editingProcess()!.id, request)
      : this.legalProcessesService.createLegalProcess(request as CreateLegalProcessRequest);

    operation.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.togglePanel();
        this.loadProcesses();
      },
      error: (error) => {
        console.error('Error saving process:', error);
        this.formError.set(error.error?.message || 'Error al guardar el proceso');
        this.isLoading.set(false);
      },
    });
  }

  editProcess(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.processForm.patchValue({
      title: process.title,
      description: process.description || '',
      clientId: process.clientId,
      advisorIds: process.advisors?.map((a) => a.id) || [],
      status: process.status,
      stageId: process.stage?.id || '',
      riskLevelId: process.riskLevel?.id || '',
      court: process.court || '',
      caseNumber: process.caseNumber || '',
      startDate: process.startDate ? new Date(process.startDate).toISOString().slice(0, 10) : '',
      nextHearingDate: process.nextHearingDate ? new Date(process.nextHearingDate).toISOString().slice(0, 10) : '',
      endDate: process.endDate ? new Date(process.endDate).toISOString().slice(0, 10) : '',
    });
    this.configureEditableFields(process.status);
    this.panelOpen.set(true);
  }

  openStatusModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.statusForm.patchValue({
      status: process.status,
      notes: '',
    });
    this.statusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.statusModalOpen.set(false);
    this.editingProcess.set(null);
    this.statusForm.reset();
    this.formError.set(null);
  }

  // HU-17: Abrir modal de historial
  openHistoryModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.historyModalOpen.set(true);
    this.loadProcessHistory(process.id);
  }

  // HU-17: Cerrar modal de historial
  closeHistoryModal(): void {
    this.historyModalOpen.set(false);
    this.editingProcess.set(null);
    this.processHistory.set([]);
  }

  // HU-17: Cargar historial del proceso
  loadProcessHistory(processId: string): void {
    this.isLoadingHistory.set(true);
    this.processEventsService.getProcessHistory(processId).subscribe({
      next: (events) => {
        this.processHistory.set(events);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading process history:', error);
        this.isLoadingHistory.set(false);
      },
    });
  }

  // HU-16: Abrir modal de anotación
  openAnnotationModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.annotationModalOpen.set(true);
    this.annotationForm.reset();
    this.annotationFiles.set([]);
  }

  // HU-16: Cerrar modal de anotación
  closeAnnotationModal(): void {
    this.annotationModalOpen.set(false);
    this.editingProcess.set(null);
    this.annotationForm.reset();
    this.annotationFiles.set([]);
    this.formError.set(null);
  }

  // HU-16: Manejar selección de archivos
  onAnnotationFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.annotationFiles.set([...this.annotationFiles(), ...filesArray]);
    }
  }

  // HU-16: Remover archivo de la lista
  removeAnnotationFile(index: number): void {
    const files = this.annotationFiles();
    files.splice(index, 1);
    this.annotationFiles.set([...files]);
  }

  // HU-16: Crear anotación y subir archivos
  submitAnnotation(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.annotationForm.invalid || !this.editingProcess()) {
      return;
    }

    this.isLoading.set(true);
    this.formError.set(null);
    const description = this.annotationForm.getRawValue().description;
    const processId = this.editingProcess()!.id;

    // Primero crear la anotación
    this.processEventsService
      .createAnnotation(processId, description)
      .pipe(
        // Luego subir archivos si hay, vinculándolos a la anotación creada
        switchMap((annotationEvent) => {
          const files = this.annotationFiles();
          if (files.length === 0) {
            return of(null);
          }
          // Obtener el ID del evento de anotación creado
          const annotationEventId = annotationEvent.id;
          // Subir todos los archivos en paralelo, vinculados a la anotación
          const uploads = files.map((file) =>
            this.filesService.uploadFile(file, 'legal_process', processId, undefined, annotationEventId),
          );
          return forkJoin(uploads);
        }),
      )
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.closeAnnotationModal();
          // Recargar historial si está abierto
          if (this.historyModalOpen()) {
            this.loadProcessHistory(processId);
          }
        },
        error: (error) => {
          console.error('Error creating annotation:', error);
          this.formError.set(error.error?.message || 'Error al crear anotación o subir archivos');
          this.isLoading.set(false);
        },
      });
  }

  async updateStatus(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    if (this.statusForm.invalid || !this.editingProcess()) {
      return;
    }

    const request: UpdateProcessStatusRequest = this.statusForm.getRawValue();

    if (getValidNextStatuses(request.status).length === 0) {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Confirmar cambio de estado',
        message: `Cambiar el proceso a "${getStatusLabel(request.status)}" es definitivo: no se podrá volver a cambiar su estado después. ¿Deseas continuar?`,
        danger: true,
      });
      if (!confirmed) {
        return;
      }
    }

    this.isLoading.set(true);
    this.formError.set(null);

    this.legalProcessesService.updateProcessStatus(this.editingProcess()!.id, request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeStatusModal();
        this.loadProcesses();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.formError.set(error.error?.message || 'Error al actualizar el estado');
        this.isLoading.set(false);
      },
    });
  }

  async deleteProcess(process: LegalProcessResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar proceso',
      message: `¿Estás seguro de eliminar el proceso "${process.title}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.legalProcessesService.deleteLegalProcess(process.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loadProcesses();
      },
      error: (error) => {
        console.error('Error deleting process:', error);
        alert('Error al eliminar el proceso');
        this.isLoading.set(false);
      },
    });
  }

  // Workflow helpers
  configureEditableFields(status: ProcessStatus): void {
    // Habilitar todos los campos primero
    Object.keys(this.processForm.controls).forEach((key) => {
      this.processForm.get(key)?.enable();
    });

    // Configurar restricciones según el estado
    switch (status) {
      case ProcessStatus.DRAFT:
        // En borrador, todos los campos son editables
        break;

      case ProcessStatus.ACTIVE:
        // En activo, no se puede cambiar el número de caso ni el cliente
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        break;

      case ProcessStatus.UNDER_REVIEW:
        // En revisión, no se puede cambiar caso, cliente (más restrictivo que activo)
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        this.processForm.get('status')?.disable(); // Evitar cambio directo de estado
        break;

      case ProcessStatus.SUSPENDED:
        // Suspendido, no se puede cambiar caso, cliente, ni etapa
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        this.processForm.get('stageId')?.disable();
        break;

      case ProcessStatus.COMPLETED:
      case ProcessStatus.CANCELLED:
      case ProcessStatus.ARCHIVED:
        // Procesos finalizados no son editables
        Object.keys(this.processForm.controls).forEach((key) => {
          this.processForm.get(key)?.disable();
        });
        break;
    }
  }

  toggleAdvisor(advisorId: string): void {
    const currentIds = this.processForm.get('advisorIds')?.value || [];
    const index = currentIds.indexOf(advisorId);

    if (index > -1) {
      // Remover el ID
      this.processForm.patchValue({
        advisorIds: currentIds.filter((id: string) => id !== advisorId),
      });
    } else {
      // Agregar el ID
      this.processForm.patchValue({
        advisorIds: [...currentIds, advisorId],
      });
    }
  }

  generateCaseNumber(): void {
    // Formato: PROC-YYYY-NNNNNN
    // PROC: Prefijo (configurable por empresa en futuro)
    // YYYY: Año actual
    // NNNNNN: Número secuencial basado en timestamp
    const year = new Date().getFullYear();
    const sequence = Date.now().toString().slice(-6);
    const caseNumber = `PROC-${year}-${sequence}`;

    this.processForm.patchValue({ caseNumber });
  }

  // Descargar archivo desde el historial
  downloadFile(fileId: string): void {
    this.filesService.downloadFile(fileId).subscribe({
      next: () => {
        console.log('Descarga iniciada');
      },
      error: (error) => {
        console.error('Error al descargar archivo:', error);
        alert('Error al descargar el archivo');
      },
    });
  }

  // Preview file from history
  previewFileFromHistory(fileId: string, filename: string): void {
    this.filesService.getDownloadUrl(fileId).subscribe({
      next: (response) => {
        const contentType = this.getContentTypeFromFilename(filename);
        this.previewingFile.set({
          id: fileId,
          originalFilename: filename,
          isImage: contentType.startsWith('image/'),
          isPdf: contentType === 'application/pdf',
        });
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.url));
      },
      error: (error) => {
        console.error('Error al obtener URL del archivo:', error);
        alert('Error al cargar vista previa del archivo');
      },
    });
  }

  // Close preview modal
  closePreviewModal(): void {
    this.previewingFile.set(null);
    this.previewUrl.set(null);
  }

  // Helper: Get content type from filename
  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }

  // Lifecycle hooks
  ngOnInit(): void {
    // Suscribirse a eventos de eliminación de archivos para sincronizar vistas
    this.fileDeletedSubscription = this.filesService.fileDeleted$.subscribe(() => {
      // Si el modal de historial está abierto, recargar el historial del proceso actual
      if (this.historyModalOpen() && this.editingProcess()) {
        this.loadProcessHistory(this.editingProcess()!.id);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar suscripción para evitar memory leaks
    this.fileDeletedSubscription?.unsubscribe();
  }
}
