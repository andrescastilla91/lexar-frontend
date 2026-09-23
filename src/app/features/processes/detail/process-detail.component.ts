import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { ProcessEventsService } from '../../../core/services/process-events.service';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { ClientsService } from '../../../core/services/clients.service';
import { FilesService } from '../../../core/services/files.service';
import { DeadlinesService } from '../../../core/services/deadlines.service';
import { TasksService } from '../../../core/services/tasks.service';
import { TaskStatusesService } from '../../../core/services/task-statuses.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PortalVisibilityPolicyService } from '../../../core/services/portal-visibility-policy.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse, ClientMatterResponse, ClientMatterStatus } from '../../../core/models/client-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import {
  LegalProcessResponse,
  ProcessStatus,
  UpdateLegalProcessRequest,
  UpdateProcessStatusRequest,
} from '../../../core/models/legal-process.model';
import {
  CreateDeadlineRequest,
  DeadlineResponse,
  DeadlineStatus,
} from '../../../core/models/deadline.model';
import { CreateTaskRequest, TaskResponse, TaskTemplateResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { ProcessEvent, ProcessEventType } from '../../../core/models/process-event.model';
import { PortalEventVisibilityPolicy } from '../../../core/models/portal-visibility-policy.model';
import { FilePreviewModalComponent } from '../../../core/components/file-preview-modal.component';
import { ProcessStatusModalComponent } from '../components/process-status-modal.component';
import { ProcessAnnotationModalComponent } from '../components/process-annotation-modal.component';
import { ProcessHistoryModalComponent } from '../components/process-history-modal.component';
import { ProcessDeadlinesListComponent } from '../components/process-deadlines-list.component';
import { DeadlineFormModalComponent } from '../../../shared/components/deadline-form-modal/deadline-form-modal.component';
import { ProcessTasksModalComponent } from '../components/process-tasks-modal.component';
import { ProcessCounterpartiesModalComponent } from '../components/process-counterparties-modal.component';
import {
  getStatusClasses,
  getStatusDot,
  getStatusLabel,
  getValidNextStatuses,
  isProcessEditable,
} from '../utils/process-format.utils';

type ProcessDetailTab = 'datos' | 'contrapartes' | 'plazos' | 'tareas' | 'historial';

/**
 * F40 Ola 4a: ficha de detalle de proceso, mismo patrón que
 * `ClientDetailComponent`/`UserDetailComponent` (F33/F34) — reemplaza el
 * modelo de 7 overlays superpuestos sobre un `editingProcess` compartido en
 * `processes.component.ts` por una ruta propia (`/procesos/:id`) con tabs.
 *
 * Los modales "tontos" (plazos/tareas/historial) y el "smart" de
 * contrapartes se reutilizan sin rediseño interno — solo se les agrega
 * `[embedded]="true"` para que rendericen como panel de pestaña en vez de
 * overlay `fixed inset-0` (ver comentario en cada componente). Todo el
 * estado/lógica que antes vivía en `processes.component.ts` para esas
 * funciones se traslada aquí, operando sobre el proceso cargado por ruta en
 * vez de un `editingProcess` señal compartida entre 7 modales.
 *
 * Ajuste 2026-09-21 (feedback de diseño sobre la primera versión): la
 * pestaña "Anotaciones" se retiró — ProcessAnnotationModalComponent ahora
 * se abre como overlay real desde "Agregar anotación" en la cabecera,
 * junto a "Cambiar estado" (evita el campo "Descripción" duplicado con el
 * de la pestaña Datos, y el hecho de que la anotación creada solo era
 * visible después en la pestaña Historial). Los paneles embebidos de
 * contrapartes/plazos/tareas también se reajustaron: cada uno reemplaza su
 * tab-strip interno por un header título+acción (mismo patrón que
 * `ClientMattersPanelComponent`, F34) y abre el alta/edición en un diálogo
 * flotante propio, para que el listado de cada pestaña quede siempre
 * visible sin scroll forzado.
 */
@Component({
  selector: 'app-process-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HasPermissionDirective,
    MultiSelectComponent,
    NgxEditorModule,
    ProcessStatusModalComponent,
    ProcessAnnotationModalComponent,
    ProcessHistoryModalComponent,
    ProcessDeadlinesListComponent,
    DeadlineFormModalComponent,
    ProcessTasksModalComponent,
    ProcessCounterpartiesModalComponent,
    FilePreviewModalComponent,
  ],
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (!process()) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">Proceso no encontrado</p>
        <a routerLink="/procesos" class="mt-4 inline-block text-sm font-semibold text-navy-900">Volver al listado</a>
      </div>
    } @else {
      <div class="space-y-6">
        <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a routerLink="/procesos" class="text-xs font-medium text-subtle hover:text-muted">&larr; Procesos</a>
            <div class="mt-1 flex flex-wrap items-center gap-3">
              <h2 class="text-2xl font-semibold text-text">{{ process()!.title }}</h2>
              <!-- F40 §PRO-06: código interno con la misma jerarquía visual que el radicado — ya no es una nota al pie del formulario. -->
              <span class="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-xs font-semibold text-text">
                {{ process()!.internalCode }}
              </span>
            </div>
            <p class="text-sm text-subtle">
              {{ process()!.client.fullName }} · {{ process()!.caseNumber || 'Sin radicado asignado' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              [class]="getStatusClasses(process()!.status)"
            >
              <span class="h-2 w-2 rounded-full" [class]="getStatusDot(process()!.status)"></span>
              {{ getStatusLabel(process()!.status) }}
            </span>
            <!-- F40 Ola 4a: sin *hasPermission — igual que el botón original
                 en processes-table.component.ts, el backend ya gatea
                 PATCH /:id/status con legal_processes.update_status. -->
            @if (validNextStatuses().length > 0) {
              <button
                type="button"
                (click)="openStatusModal()"
                class="rounded-md border border-default px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cambiar estado
              </button>
            }
            <!-- F40 Ola 4a: ajuste 2026-09-21 (feedback punto 4) — "Agregar
                 anotación" pasa de pestaña propia a acción rápida de
                 cabecera, junto a "Cambiar estado"; abre
                 ProcessAnnotationModalComponent como overlay real. -->
            <button
              type="button"
              (click)="openAnnotationModal()"
              class="rounded-md border border-default px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-muted"
            >
              Agregar anotación
            </button>
          </div>
        </header>

        <nav class="flex flex-wrap gap-1 border-b border-default">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              class="rounded-t-md px-4 py-2 text-sm font-medium transition"
              [class]="activeTab() === tab.id
                ? 'border-b-2 border-navy-900 text-navy-900'
                : 'text-subtle hover:text-muted'"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        @switch (activeTab()) {
          @case ('datos') {
            <form [formGroup]="editForm" (ngSubmit)="saveDatos()" class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
              @if (processStatusMessage()) {
                <div class="rounded-md border border-warning bg-warning-tint px-4 py-3">
                  <p class="text-sm text-warning">{{ processStatusMessage() }}</p>
                </div>
              }

              <label class="block text-sm text-muted">
                Título del proceso *
                <input
                  formControlName="title"
                  type="text"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                />
              </label>

              <div class="block text-sm text-muted">
                Descripción
                <!-- F40 §PRO-08 (ola 4b): editor WYSIWYG (ngx-editor) — el HTML
                     que produce se sanitiza en el backend antes de guardar,
                     nunca se confía en el HTML que manda el cliente. -->
                <div class="NgxEditor__Wrapper mt-2 rounded-md border border-default shadow-card">
                  <ngx-editor-menu [editor]="editor" [toolbar]="editorToolbar" />
                  <ngx-editor
                    [editor]="editor"
                    formControlName="description"
                    placeholder="Descripción del proceso…"
                    class="min-h-[8rem] text-sm text-text"
                  />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Cliente *
                  <select
                    formControlName="clientId"
                    (change)="onClientChanged()"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="">Seleccionar cliente</option>
                    @for (client of clients(); track client.id) {
                      <option [value]="client.id">{{ client.fullName }}</option>
                    }
                  </select>
                </label>
                <label class="text-sm text-muted">
                  Asunto
                  <select
                    formControlName="matterId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="">Sin asunto</option>
                    @for (matter of matters(); track matter.id) {
                      <option [value]="matter.id">{{ matter.name }}</option>
                    }
                  </select>
                  @if (selectedMatter()?.isDeleted) {
                    <p class="mt-1 text-xs text-warning">Este asunto fue eliminado. Se mantiene la referencia en el proceso.</p>
                  } @else if (selectedMatter()?.status === ClientMatterStatus.VENCIDO) {
                    <p class="mt-1 text-xs text-warning">Este asunto está vencido. Considera renovarlo o cerrarlo desde la ficha del cliente.</p>
                  }
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Tipo de proceso
                  <select
                    formControlName="processTypeId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="">Sin clasificar</option>
                    @for (processType of processTypes(); track processType.id) {
                      <option [value]="processType.id">{{ processType.label }}</option>
                    }
                  </select>
                </label>
                <label class="text-sm text-muted">
                  Etapa
                  <select
                    formControlName="stageId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    @for (stage of filteredStages(); track stage.id) {
                      <option [value]="stage.id">{{ stage.label }}</option>
                    }
                  </select>
                  @if (isSelectedStageOutOfScope()) {
                    <p class="mt-1 text-xs text-warning">Esta etapa no está configurada para el tipo de proceso seleccionado.</p>
                  }
                </label>
              </div>

              <!-- F40 §PRO-08 (ola 4b): cuantía, moneda y contingencia — información de
                   valoración/riesgo financiero, se completa una vez el caso está siendo
                   trabajado, no al momento de la apertura (por eso vive aquí y no en el
                   modal de creación). -->
              <div class="grid gap-4 md:grid-cols-3">
                <label class="text-sm text-muted">
                  Cuantía
                  <input
                    formControlName="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                </label>
                <label class="text-sm text-muted">
                  Moneda
                  <select
                    formControlName="currency"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label class="text-sm text-muted">
                  Contingencia
                  <select
                    formControlName="contingencyId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="">Sin clasificar</option>
                    @for (contingency of contingencies(); track contingency.id) {
                      <option [value]="contingency.id">{{ contingency.label }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="text-sm text-muted">
                <app-multi-select
                  [items]="advisorItems()"
                  [selectedIds]="editForm.get('advisorIds')?.value || []"
                  label="Asesores responsables"
                  placeholder="Buscar asesor…"
                  emptyStateText="No hay asesores disponibles"
                  (selectionChange)="editForm.patchValue({ advisorIds: $event })"
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Juzgado o entidad
                  <input
                    formControlName="court"
                    type="text"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                </label>
                <label class="text-sm text-muted">
                  Número de caso (radicado)
                  <input
                    formControlName="caseNumber"
                    type="text"
                    placeholder="Radicado o número de expediente"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                  <p class="mt-1 text-xs text-subtle">Lo asigna el juzgado — opcional, puedes registrarlo cuando se conozca.</p>
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Fecha de inicio
                  <input
                    formControlName="startDate"
                    type="date"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                </label>
                <label class="text-sm text-muted">
                  Fecha de fin
                  <input
                    formControlName="endDate"
                    type="date"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                </label>
              </div>
              <p class="text-xs text-subtle">
                La próxima audiencia se calcula automáticamente a partir de los plazos de tipo "Audiencia" registrados en la pestaña Plazos.
              </p>

              @if (errorMessage()) {
                <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
              }

              <button
                *hasPermission="'legal_processes.edit'"
                type="submit"
                class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong disabled:opacity-50"
                [disabled]="isSaving() || !canEditProcess()"
              >
                Guardar cambios
              </button>
            </form>
          }
          @case ('contrapartes') {
            <app-process-counterparties-modal
              [isOpen]="true"
              [embedded]="true"
              [legalProcessId]="process()!.id"
              [processTitle]="process()!.title"
            />
          }
          @case ('plazos') {
            <app-process-deadlines-list
              [isLoading]="isLoadingDeadlines()"
              [deadlines]="processDeadlines()"
              [canEdit]="canEditDeadline()"
              (create)="openCreateDeadlineModal()"
              (markDone)="markDeadlineDone($event)"
              (deleteDeadline)="deleteDeadlineItem($event)"
              (edit)="goToEditDeadline($event)"
            />
            <app-deadline-form-modal
              [isOpen]="createDeadlineModalOpen()"
              [isSubmitting]="isSubmittingDeadline()"
              [errorMessage]="deadlineFormError()"
              [form]="deadlineForm"
              [showProcessField]="false"
              [deadlineTypes]="deadlineTypes()"
              [advisors]="advisors()"
              [relatedAdvisorUserIds]="processAdvisorUserIds()"
              (formCancel)="closeCreateDeadlineModal()"
              (formSubmit)="submitCreateDeadline()"
              (assigneesChange)="onDeadlineAssigneesChange($event)"
            />
          }
          @case ('tareas') {
            <app-process-tasks-modal
              [isOpen]="true"
              [embedded]="true"
              [processTitle]="process()!.title"
              [isLoading]="isLoadingTasks()"
              [isSubmitting]="isSubmittingTask()"
              [isInstantiating]="isInstantiatingTemplate()"
              [errorMessage]="taskFormError()"
              [tasks]="processTasks()"
              [advisors]="process()!.advisors ?? []"
              [templates]="taskTemplates()"
              [statuses]="taskStatuses()"
              [form]="taskForm"
              (submit)="submitTask()"
              (taskUpdated)="onProcessTaskUpdated($event)"
              (deleteTask)="deleteTaskItem($event)"
              (instantiateTemplate)="instantiateTaskTemplate($event)"
            />
          }
          @case ('historial') {
            <app-process-history-modal
              [isOpen]="true"
              [embedded]="true"
              [processTitle]="process()!.title"
              [isLoadingHistory]="isLoadingHistory()"
              [events]="processHistory()"
              [visibilityPolicies]="visibilityPolicies()"
              (previewFile)="previewFileFromHistory($event.fileId, $event.filename)"
              (downloadFile)="downloadFile($event)"
              (toggleVisibility)="toggleEventVisibility($event)"
            />
          }
        }
      </div>

      <!-- Cambiar estado (HU-14) — acción rápida de cabecera, no es tab. -->
      <app-process-status-modal
        [form]="statusForm"
        [isOpen]="statusModalOpen()"
        [isSubmitting]="isUpdatingStatus()"
        [errorMessage]="statusError()"
        [validNextStatuses]="validNextStatuses()"
        (close)="closeStatusModal()"
        (submit)="updateStatus()"
      />

      <!-- Agregar anotación (HU-16) — F40 Ola 4a: acción rápida de cabecera,
           ya no es tab (feedback 2026-09-21 punto 4). Overlay real
           (sin [embedded]), mismo patrón que app-process-status-modal. -->
      <app-process-annotation-modal
        [isOpen]="annotationModalOpen()"
        [form]="annotationForm"
        [isSubmitting]="isSavingAnnotation()"
        [errorMessage]="annotationError()"
        [processTitle]="process()!.title"
        [files]="annotationFiles()"
        [visibilityMode]="annotationVisibilityMode()"
        (close)="closeAnnotationModal()"
        (submit)="submitAnnotation()"
        (filesSelected)="onAnnotationFilesSelected($event)"
        (removeFile)="removeAnnotationFile($event)"
      />

      <!-- Vista previa de archivos adjuntos en el historial -->
      <app-file-preview-modal
        [file]="previewingFile()"
        [url]="previewUrl()"
        (close)="closePreviewModal()"
        (download)="downloadFile(previewingFile()!.id)"
      />
    }
  `,
})
export class ProcessDetailComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly processEventsService = inject(ProcessEventsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly filesService = inject(FilesService);
  private readonly deadlinesService = inject(DeadlinesService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly tasksService = inject(TasksService);
  private readonly taskStatusesService = inject(TaskStatusesService);
  private readonly visibilityPolicyService = inject(PortalVisibilityPolicyService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  private fileDeletedSubscription?: Subscription;

  readonly tabs: { id: ProcessDetailTab; label: string }[] = [
    { id: 'datos', label: 'Datos' },
    { id: 'contrapartes', label: 'Contrapartes' },
    { id: 'plazos', label: 'Plazos' },
    { id: 'tareas', label: 'Tareas' },
    { id: 'historial', label: 'Historial' },
  ];
  readonly activeTab = signal<ProcessDetailTab>('datos');

  readonly process = signal<LegalProcessResponse | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly clients = signal<ClientResponse[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  /** F41 (ola 4, correcciones #2): ids de usuario de los asesores ya
   * relacionados con este proceso — para priorizarlos en
   * DeadlineFormModalComponent. */
  readonly processAdvisorUserIds = computed<string[]>(() =>
    (this.process()?.advisors ?? []).map((advisor) => advisor.userId),
  );
  readonly matters = signal<ClientMatterResponse[]>([]);
  readonly processTypes = signal<CatalogItem[]>([]);
  /** F40 §PRO-08 (ola 4b). */
  readonly contingencies = signal<CatalogItem[]>([]);
  readonly stages = signal<CatalogItem[]>([]);
  readonly riskLevels = signal<CatalogItem[]>([]);

  /**
   * F40 §PRO-08 (ola 4b): primer editor WYSIWYG del producto (decisión de
   * librería: `ngx-editor` — basado en ProseMirror, hecho específicamente
   * para Angular standalone sin wrapper, y más liviano que la alternativa
   * evaluada, `ngx-quill`/Quill — ver F40-ajustes-procesos-piloto.md). El
   * HTML que produce se sanitiza de todos modos en el backend
   * (`LegalProcessesService.sanitizeDescriptionHtml`) antes de persistir —
   * nunca se confía en el HTML del cliente.
   */
  editor!: Editor;
  readonly editorToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3'] }],
    ['blockquote'],
    ['link'],
  ];

  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClasses = getStatusClasses;
  protected readonly getStatusDot = getStatusDot;
  protected readonly ClientMatterStatus = ClientMatterStatus;

  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    clientId: ['', [Validators.required]],
    advisorIds: [[] as string[]],
    stageId: ['', [Validators.required]],
    riskLevelId: ['', [Validators.required]],
    court: [''],
    caseNumber: [''],
    startDate: [''],
    endDate: [''],
    matterId: [''],
    processTypeId: [''],
    contingencyId: [''],
    amount: [''],
    currency: ['COP'],
  });

  readonly advisorItems = computed<MultiSelectItem[]>(() =>
    this.advisors().map((advisor) => ({
      id: advisor.id,
      label: `${advisor.user?.firstName ?? ''} ${advisor.user?.lastName ?? ''}`.trim(),
      description: advisor.specialties?.[0]?.label || 'N/A',
    })),
  );

  selectedProcessTypeId(): string {
    return this.editForm.get('processTypeId')?.value || '';
  }

  filteredStages(): CatalogItem[] {
    const processTypeId = this.selectedProcessTypeId();
    const inScope = this.stages().filter(
      (stage) => !stage.processTypeScope || stage.processTypeScope === processTypeId,
    );
    const selectedStageId = this.editForm.get('stageId')?.value;
    if (selectedStageId && !inScope.some((stage) => stage.id === selectedStageId)) {
      const selectedStage = this.stages().find((stage) => stage.id === selectedStageId);
      if (selectedStage) {
        return [...inScope, selectedStage];
      }
    }
    return inScope;
  }

  isSelectedStageOutOfScope(): boolean {
    const processTypeId = this.selectedProcessTypeId();
    const selectedStageId = this.editForm.get('stageId')?.value;
    if (!processTypeId || !selectedStageId) {
      return false;
    }
    const stage = this.stages().find((s) => s.id === selectedStageId);
    return !!stage?.processTypeScope && stage.processTypeScope !== processTypeId;
  }

  selectedMatterId(): string {
    return this.editForm.get('matterId')?.value || '';
  }

  selectedMatter(): ClientMatterResponse | null {
    const matterId = this.selectedMatterId();
    if (!matterId) {
      return null;
    }
    return this.matters().find((m) => m.id === matterId) || null;
  }

  readonly validNextStatuses = computed(() => {
    const process = this.process();
    return process ? getValidNextStatuses(process.status) : [];
  });

  readonly canEditProcess = computed(() => {
    const process = this.process();
    return process ? isProcessEditable(process.status) : false;
  });

  readonly processStatusMessage = computed(() => {
    const process = this.process();
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

  // Cambiar estado (HU-14)
  readonly statusModalOpen = signal(false);
  readonly annotationModalOpen = signal(false);
  readonly isUpdatingStatus = signal(false);
  readonly statusError = signal<string | null>(null);
  readonly statusForm = this.fb.nonNullable.group({
    status: [ProcessStatus.DRAFT, [Validators.required]],
    notes: [''],
  });

  // Plazos (F13)
  readonly processDeadlines = signal<DeadlineResponse[]>([]);
  readonly deadlineTypes = signal<CatalogItem[]>([]);
  readonly isLoadingDeadlines = signal(false);
  readonly isSubmittingDeadline = signal(false);
  readonly deadlineFormError = signal<string | null>(null);
  /** F41 (ola 4, rediseño 2026-09-23): SOLO campos de alta — Notas, Cómputo
   * del término y Duración se completan en la ficha de edición
   * (/calendario/plazos/:id) tras crear, nunca aquí (ver
   * DeadlineFormModalComponent). La edición de un plazo existente ya no
   * pasa por este formulario — navega a esa ficha (ver goToEditDeadline). */
  readonly deadlineForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    typeId: ['', [Validators.required]],
    dueAt: ['', [Validators.required]],
    allDay: [false],
    assigneeUserIds: [[] as string[]],
  });
  readonly createDeadlineModalOpen = signal(false);
  /** F41 (ola 4): gatea el botón "Editar" de cada fila del listado. */
  readonly canEditDeadline = computed(() =>
    this.permissionsService.hasPermission('deadlines.update'),
  );

  // Tareas (F14)
  readonly processTasks = signal<TaskResponse[]>([]);
  readonly taskTemplates = signal<TaskTemplateResponse[]>([]);
  readonly taskStatuses = signal<TaskStatusResponse[]>([]);
  readonly isLoadingTasks = signal(false);
  readonly isSubmittingTask = signal(false);
  readonly isInstantiatingTemplate = signal(false);
  readonly taskFormError = signal<string | null>(null);
  readonly taskForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    assigneeUserId: [''],
    dueAt: [''],
  });

  // Anotaciones (HU-16)
  // F40 §PRO-08 (ola 4b): 2000 -> 50_000, mismo motivo que
  // CreateAnnotationDto.description en el backend — el HTML del editor
  // WYSIWYG infla el conteo de caracteres sobre el mismo texto.
  readonly annotationForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(50_000)]],
    markAsInternal: [false],
  });
  readonly annotationFiles = signal<File[]>([]);
  readonly isSavingAnnotation = signal(false);
  readonly annotationError = signal<string | null>(null);

  // Historial (HU-17) + F27 visibilidad de portal
  readonly processHistory = signal<ProcessEvent[]>([]);
  readonly isLoadingHistory = signal(false);
  readonly visibilityPolicies = signal<PortalEventVisibilityPolicy[]>([]);
  readonly annotationVisibilityMode = computed(
    () =>
      this.visibilityPolicies().find((p) => p.eventType === ProcessEventType.ANNOTATION)?.mode ?? null,
  );
  readonly previewingFile = signal<{
    id: string;
    originalFilename: string;
    isImage: boolean;
    isPdf: boolean;
  } | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);

  constructor() {
    this.editForm.get('clientId')!.valueChanges.subscribe((clientId) => {
      this.loadMattersForClient(clientId || null);
    });
  }

  ngOnInit(): void {
    // F40 §PRO-08 (ola 4b): el Editor de ngx-editor se instancia una sola
    // vez por componente (no por proceso) — el mismo control de formulario
    // se re-usa entre navegaciones a distintos `/procesos/:id` porque el
    // componente completo se recrea por ruta.
    this.editor = new Editor();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }
    // F41 (ola 4, rediseño 2026-09-23): al volver desde la ficha de un
    // plazo (/calendario/plazos/:id?returnTo=proceso&...&tab=plazos, ver
    // DeadlineDetailComponent/goToEditDeadline), reabre la pestaña Plazos
    // en vez de la de "Datos" por defecto.
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'plazos') {
      this.activeTab.set('plazos');
    }
    this.loadCatalogs();
    this.loadAdvisors();
    this.loadClients();
    this.loadTaskStatuses();
    this.loadTaskTemplates();
    this.loadVisibilityPolicies();
    this.loadProcess(id);

    this.fileDeletedSubscription = this.filesService.fileDeleted$.subscribe(() => {
      const current = this.process();
      if (current) {
        this.loadHistory(current.id);
      }
    });
  }

  ngOnDestroy(): void {
    this.fileDeletedSubscription?.unsubscribe();
    this.editor?.destroy();
  }

  private loadProcess(id: string): void {
    this.isLoading.set(true);
    this.legalProcessesService.getLegalProcess(id).subscribe({
      next: (process) => {
        this.process.set(process);
        this.patchEditForm(process);
        this.isLoading.set(false);
        this.loadDeadlines(process.id);
        this.loadTasks(process.id);
        this.loadHistory(process.id);
      },
      error: () => {
        this.process.set(null);
        this.isLoading.set(false);
      },
    });
  }

  private patchEditForm(process: LegalProcessResponse): void {
    this.editForm.patchValue(
      {
        title: process.title,
        description: process.description || '',
        clientId: process.clientId,
        advisorIds: process.advisors?.map((a) => a.id) || [],
        stageId: process.stage?.id || '',
        riskLevelId: process.riskLevel?.id || '',
        court: process.court || '',
        caseNumber: process.caseNumber || '',
        startDate: process.startDate ? new Date(process.startDate).toISOString().slice(0, 10) : '',
        endDate: process.endDate ? new Date(process.endDate).toISOString().slice(0, 10) : '',
        matterId: process.matterId || '',
        processTypeId: process.processType?.id || '',
        contingencyId: process.contingency?.id || '',
        amount: process.amount ?? '',
        currency: process.currency || 'COP',
      },
      { emitEvent: false },
    );
    this.loadMattersForClient(process.clientId || null, this.buildDeletedMatterEntry(process));
    this.configureEditableFields(process.status);
  }

  private loadCatalogs(): void {
    this.catalogsService.getActiveCatalog('process_stage').subscribe((items) => this.stages.set(items));
    this.catalogsService.getActiveCatalog('risk_level').subscribe((items) => this.riskLevels.set(items));
    this.catalogsService.getActiveCatalog('deadline_type').subscribe((items) => this.deadlineTypes.set(items));
    this.catalogsService.getActiveCatalog('process_type').subscribe((items) => this.processTypes.set(items));
    this.catalogsService.getActiveCatalog('contingency').subscribe((items) => this.contingencies.set(items));
  }

  private loadAdvisors(): void {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => this.advisors.set(response.advisors),
      error: (error) => console.error('Error loading advisors:', error),
    });
  }

  private loadClients(): void {
    this.clientsService.getClients(1, 100).subscribe({
      next: (response) => this.clients.set(response.clients),
      error: (error) => console.error('Error loading clients:', error),
    });
  }

  private loadMattersForClient(clientId: string | null, syntheticMatter?: ClientMatterResponse): void {
    if (!clientId) {
      this.matters.set(syntheticMatter ? [syntheticMatter] : []);
      return;
    }
    this.clientsService.getMatters(clientId).subscribe({
      next: (matters) =>
        this.matters.set(
          syntheticMatter && !matters.some((m) => m.id === syntheticMatter.id)
            ? [...matters, syntheticMatter]
            : matters,
        ),
      error: () => this.matters.set(syntheticMatter ? [syntheticMatter] : []),
    });
  }

  onClientChanged(): void {
    this.editForm.patchValue({ matterId: '' });
  }

  private buildDeletedMatterEntry(process: LegalProcessResponse): ClientMatterResponse | undefined {
    if (!process.matter?.isDeleted) {
      return undefined;
    }
    return {
      id: process.matter.id,
      clientId: process.clientId,
      contractType: process.matter.contractType,
      name: process.matter.name,
      description: null,
      startDate: null,
      endDate: null,
      status: process.matter.status,
      processCount: 0,
      createdAt: '',
      updatedAt: '',
      isDeleted: true,
    };
  }

  // F40 (2026-09-22): `caseNumber` (radicado) se sacó del bloqueo por
  // estado. Tenía sentido bloquearlo cuando era el identificador principal
  // del proceso, pero desde PRO-06 (ola 1) ese rol lo tiene `internalCode`
  // (estable, generado por el sistema) — el radicado es metadato opcional
  // que el juzgado asigna, con frecuencia DESPUÉS de activar el proceso
  // (ver PRO-08 en el doc de F40), así que bloquearlo justo al activar
  // impedía completarlo cuando más falta hacía. Tampoco hay ninguna regla
  // de negocio en el backend que dependa de su inmutabilidad (a diferencia
  // de `clientId`, que sigue bloqueado: cambiar el cliente de un proceso
  // activo sí tiene implicaciones reales de facturación/portal/conflicto
  // de interés).
  private configureEditableFields(status: ProcessStatus): void {
    Object.keys(this.editForm.controls).forEach((key) => {
      this.editForm.get(key)?.enable({ emitEvent: false });
    });

    switch (status) {
      case ProcessStatus.DRAFT:
        break;
      case ProcessStatus.ACTIVE:
        this.editForm.get('clientId')?.disable({ emitEvent: false });
        break;
      case ProcessStatus.UNDER_REVIEW:
        this.editForm.get('clientId')?.disable({ emitEvent: false });
        break;
      case ProcessStatus.SUSPENDED:
        this.editForm.get('clientId')?.disable({ emitEvent: false });
        this.editForm.get('stageId')?.disable({ emitEvent: false });
        break;
      case ProcessStatus.COMPLETED:
      case ProcessStatus.CANCELLED:
      case ProcessStatus.ARCHIVED:
        Object.keys(this.editForm.controls).forEach((key) => {
          this.editForm.get(key)?.disable({ emitEvent: false });
        });
        break;
    }
  }

  saveDatos(): void {
    const current = this.process();
    if (!current || this.isSaving()) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const formValue = this.editForm.getRawValue();

    const request: UpdateLegalProcessRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      stageId: formValue.stageId || undefined,
      riskLevelId: formValue.riskLevelId || undefined,
      court: formValue.court || undefined,
      caseNumber: formValue.caseNumber || undefined,
      startDate: formValue.startDate || undefined,
      endDate: formValue.endDate || undefined,
      clientId: formValue.clientId,
      advisorIds: formValue.advisorIds,
      matterId: formValue.matterId || undefined,
      processTypeId: formValue.processTypeId || undefined,
      contingencyId: formValue.contingencyId || undefined,
      amount: formValue.amount ? Number(formValue.amount) : undefined,
      currency: formValue.currency || undefined,
    };

    this.legalProcessesService.updateLegalProcess(current.id, request).subscribe({
      next: (updated) => {
        this.process.set(updated);
        this.isSaving.set(false);
        this.toast.success('Proceso actualizado exitosamente');
      },
      error: (error) => {
        // BUG-10: legalProcessesService envuelve el error en un Error nativo
        // con el mensaje real extraído (.message).
        const message = error.message || 'Error al guardar el proceso';
        this.errorMessage.set(message);
        this.toast.error(message);
        this.isSaving.set(false);
      },
    });
  }

  // Cambiar estado (HU-14)
  openStatusModal(): void {
    const current = this.process();
    if (!current) {
      return;
    }
    this.statusForm.patchValue({ status: current.status, notes: '' });
    this.statusError.set(null);
    this.statusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.statusModalOpen.set(false);
    this.statusForm.reset();
    this.statusError.set(null);
  }

  // Agregar anotación (HU-16) — F40 Ola 4a: acción rápida de cabecera.
  openAnnotationModal(): void {
    this.annotationForm.reset({ description: '', markAsInternal: false });
    this.annotationFiles.set([]);
    this.annotationError.set(null);
    this.annotationModalOpen.set(true);
  }

  closeAnnotationModal(): void {
    this.annotationModalOpen.set(false);
  }

  async updateStatus(): Promise<void> {
    const current = this.process();
    if (!current || this.isUpdatingStatus()) {
      return;
    }
    if (this.statusForm.invalid) {
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

    this.isUpdatingStatus.set(true);
    this.statusError.set(null);

    this.legalProcessesService.updateProcessStatus(current.id, request).subscribe({
      next: (updated) => {
        this.isUpdatingStatus.set(false);
        this.process.set(updated);
        this.configureEditableFields(updated.status);
        this.closeStatusModal();
        this.toast.success('Estado actualizado correctamente.');
      },
      error: (error) => {
        const message = error.message || 'Error al actualizar el estado';
        this.statusError.set(message);
        this.toast.error(message);
        this.isUpdatingStatus.set(false);
      },
    });
  }

  // Plazos (F13)
  private loadDeadlines(processId: string): void {
    this.isLoadingDeadlines.set(true);
    this.deadlinesService.getForProcess(processId).subscribe({
      next: (deadlines) => {
        this.processDeadlines.set(deadlines);
        this.isLoadingDeadlines.set(false);
      },
      error: (error) => {
        console.error('Error loading process deadlines:', error);
        this.toast.error('Error al cargar los plazos del proceso');
        this.isLoadingDeadlines.set(false);
      },
    });
  }

  /** F41 (ola 4): reemplaza toggleDeadlineAssignee() — app-multi-select
   * emite la lista completa de seleccionados en vez de un id a la vez. */
  /** F41 (ola 4, correcciones #2): si se agrega a alguien que no está
   * entre los asesores relacionados con el proceso, se avisa antes de
   * aplicar la selección — no se bloquea, solo se confirma (mismo patrón
   * que CalendarComponent.onAssigneesChange). */
  async onDeadlineAssigneesChange(userIds: string[]): Promise<void> {
    const previousIds: string[] = this.deadlineForm.get('assigneeUserIds')?.value || [];
    const addedIds = userIds.filter((id) => !previousIds.includes(id));
    const relatedIds = new Set(this.processAdvisorUserIds());
    const unrelatedAdded = addedIds.filter((id) => !relatedIds.has(id));

    if (unrelatedAdded.length > 0) {
      const items = this.advisors()
        .filter((advisor) => !!advisor.user)
        .map((advisor) => ({ id: advisor.user!.id, label: `${advisor.user!.firstName} ${advisor.user!.lastName}` }));
      const names = unrelatedAdded
        .map((id) => items.find((item) => item.id === id)?.label ?? id)
        .join(', ');
      const confirmed = await this.confirmDialog.confirm({
        title: 'Asesor no relacionado con el proceso',
        message: `${names} no pertenece a los asesores asignados a este proceso. ¿Igual quieres asignarlo a este plazo?`,
      });
      if (!confirmed) {
        this.deadlineForm.patchValue({ assigneeUserIds: previousIds });
        return;
      }
    }

    this.deadlineForm.patchValue({ assigneeUserIds: userIds });
  }

  openCreateDeadlineModal(): void {
    this.deadlineFormError.set(null);
    this.deadlineForm.reset({
      title: '',
      typeId: '',
      dueAt: '',
      allDay: false,
      assigneeUserIds: [],
    });
    this.createDeadlineModalOpen.set(true);
  }

  closeCreateDeadlineModal(): void {
    this.createDeadlineModalOpen.set(false);
    this.deadlineFormError.set(null);
  }

  /** F41 (ola 4, rediseño 2026-09-23): "editar" ya no reutiliza el
   * formulario de alta — navega a la ficha dedicada
   * (/calendario/plazos/:id, ver DeadlineDetailComponent), que además es
   * donde ahora viven Notas, Cómputo del término y Duración. `tab: 'plazos'`
   * hace que, al volver, ProcessDetailComponent reabra esta pestaña en vez
   * de la de "Datos" por defecto. */
  goToEditDeadline(deadline: DeadlineResponse): void {
    if (!this.canEditDeadline()) {
      this.toast.error('No tienes permiso para editar plazos o audiencias.');
      return;
    }
    this.router.navigate(['/calendario/plazos', deadline.id], {
      queryParams: { returnTo: 'proceso', processId: this.process()!.id, tab: 'plazos' },
    });
  }

  submitCreateDeadline(): void {
    const current = this.process();
    if (this.isSubmittingDeadline() || !current) {
      return;
    }
    if (this.deadlineForm.invalid) {
      this.deadlineForm.markAllAsTouched();
      this.deadlineFormError.set('Completa los campos obligatorios.');
      return;
    }

    this.isSubmittingDeadline.set(true);
    this.deadlineFormError.set(null);
    const formValue = this.deadlineForm.getRawValue();

    const request: CreateDeadlineRequest = {
      title: formValue.title,
      typeId: formValue.typeId,
      dueAt: new Date(formValue.dueAt).toISOString(),
      allDay: formValue.allDay,
      assigneeUserIds: formValue.assigneeUserIds,
    };

    this.deadlinesService.create(current.id, request).subscribe({
      next: (created) => {
        this.isSubmittingDeadline.set(false);
        this.toast.success('Plazo creado correctamente.');
        this.closeCreateDeadlineModal();
        // F41 (ola 4, rediseño 2026-09-23): mismo patrón que
        // CalendarComponent — al crear, se navega directo a la ficha de
        // detalle para completar Notas, Cómputo del término y Duración.
        this.router.navigate(['/calendario/plazos', created.id], {
          queryParams: { returnTo: 'proceso', processId: current.id, tab: 'plazos' },
        });
      },
      error: (error) => {
        console.error('Error creating deadline:', error);
        this.deadlineFormError.set(error.message || 'Error al crear el plazo');
        this.toast.error(error.message || 'Error al crear el plazo');
        this.isSubmittingDeadline.set(false);
      },
    });
  }

  markDeadlineDone(deadline: DeadlineResponse): void {
    this.deadlinesService.update(deadline.id, { status: DeadlineStatus.DONE }).subscribe({
      next: () => {
        this.toast.success('Plazo marcado como completado.');
        // F41 §CAL-01: DeadlineResponse.processId ahora puede ser null (evento
        // general), pero esta lista siempre está scopeada al proceso de esta
        // página — se recarga con el proceso actual, no con el del plazo.
        this.loadDeadlines(this.process()!.id);
      },
      error: (error) => {
        console.error('Error updating deadline:', error);
        this.toast.error(error.message || 'Error al actualizar el plazo');
      },
    });
  }

  async deleteDeadlineItem(deadline: DeadlineResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar plazo',
      message: `¿Estás seguro de eliminar el plazo "${deadline.title}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.deadlinesService.delete(deadline.id).subscribe({
      next: () => {
        this.toast.success('Plazo eliminado correctamente.');
        this.loadDeadlines(this.process()!.id);
      },
      error: (error) => {
        console.error('Error deleting deadline:', error);
        this.toast.error(error.message || 'Error al eliminar el plazo');
      },
    });
  }

  // Tareas (F14)
  private loadTaskStatuses(): void {
    this.taskStatusesService.getAll().subscribe({
      next: (statuses) => this.taskStatuses.set(statuses),
      error: (error) => console.error('Error loading task statuses:', error),
    });
  }

  private loadTaskTemplates(): void {
    this.tasksService.getTemplates().subscribe({
      next: (templates) => this.taskTemplates.set(templates),
      error: (error) => console.error('Error loading task templates:', error),
    });
  }

  private loadTasks(processId: string): void {
    this.isLoadingTasks.set(true);
    this.tasksService.getForProcess(processId).subscribe({
      next: (tasks) => {
        this.processTasks.set(tasks);
        this.isLoadingTasks.set(false);
      },
      error: (error) => {
        console.error('Error loading process tasks:', error);
        this.toast.error('Error al cargar las tareas del proceso');
        this.isLoadingTasks.set(false);
      },
    });
  }

  submitTask(): void {
    const current = this.process();
    if (this.isSubmittingTask() || !current) {
      return;
    }
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      this.taskFormError.set('Completa los campos obligatorios.');
      return;
    }

    this.isSubmittingTask.set(true);
    this.taskFormError.set(null);
    const formValue = this.taskForm.getRawValue();

    const request: CreateTaskRequest = {
      title: formValue.title,
      processId: current.id,
      assigneeUserId: formValue.assigneeUserId || undefined,
      dueAt: formValue.dueAt ? new Date(formValue.dueAt).toISOString() : undefined,
    };

    this.tasksService.create(request).subscribe({
      next: () => {
        this.isSubmittingTask.set(false);
        this.toast.success('Tarea creada correctamente.');
        this.taskForm.reset({ title: '', assigneeUserId: '', dueAt: '' });
        this.loadTasks(current.id);
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.taskFormError.set(error.message || 'Error al crear la tarea');
        this.toast.error(error.message || 'Error al crear la tarea');
        this.isSubmittingTask.set(false);
      },
    });
  }

  onProcessTaskUpdated(updated: TaskResponse): void {
    this.processTasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
  }

  async deleteTaskItem(task: TaskResponse): Promise<void> {
    if (task.status.isTerminal) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar tarea',
      message: `¿Estás seguro de eliminar la tarea "${task.title}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.tasksService.delete(task.id).subscribe({
      next: () => {
        this.toast.success('Tarea eliminada correctamente.');
        if (task.processId) {
          this.loadTasks(task.processId);
        }
      },
      error: (error) => {
        console.error('Error deleting task:', error);
        this.toast.error(error.message || 'Error al eliminar la tarea');
      },
    });
  }

  instantiateTaskTemplate(templateId: string): void {
    const current = this.process();
    if (!current || !templateId || this.isInstantiatingTemplate()) {
      return;
    }

    this.isInstantiatingTemplate.set(true);
    this.tasksService.instantiateTemplate(current.id, templateId).subscribe({
      next: (tasks) => {
        this.isInstantiatingTemplate.set(false);
        this.toast.success(`Se crearon ${tasks.length} tarea(s) desde la plantilla.`);
        this.loadTasks(current.id);
      },
      error: (error) => {
        console.error('Error instantiating task template:', error);
        this.toast.error(error.message || 'Error al instanciar la plantilla');
        this.isInstantiatingTemplate.set(false);
      },
    });
  }

  // Anotaciones (HU-16)
  onAnnotationFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.annotationFiles.set([...this.annotationFiles(), ...filesArray]);
    }
  }

  removeAnnotationFile(index: number): void {
    const files = this.annotationFiles();
    files.splice(index, 1);
    this.annotationFiles.set([...files]);
  }

  submitAnnotation(): void {
    const current = this.process();
    if (this.isSavingAnnotation() || !current) {
      return;
    }
    if (this.annotationForm.invalid) {
      return;
    }

    this.isSavingAnnotation.set(true);
    this.annotationError.set(null);
    const { description, markAsInternal } = this.annotationForm.getRawValue();
    const processId = current.id;

    this.processEventsService
      .createAnnotation(processId, description, markAsInternal)
      .pipe(
        switchMap((annotationEvent) => {
          const files = this.annotationFiles();
          if (files.length === 0) {
            return of(null);
          }
          const annotationEventId = annotationEvent.id;
          const uploads = files.map((file) =>
            this.filesService.uploadFile(file, 'legal_process', processId, undefined, annotationEventId),
          );
          return forkJoin(uploads);
        }),
      )
      .subscribe({
        next: () => {
          this.isSavingAnnotation.set(false);
          this.annotationForm.reset({ description: '', markAsInternal: false });
          this.annotationFiles.set([]);
          this.closeAnnotationModal();
          this.toast.success('Anotación creada correctamente.');
          this.loadHistory(processId);
        },
        error: (error) => {
          console.error('Error creating annotation:', error);
          // BUG-20: error.message, no error.error?.message.
          this.annotationError.set(error.message || 'Error al crear anotación o subir archivos');
          this.isSavingAnnotation.set(false);
        },
      });
  }

  // Historial (HU-17) + F27
  private loadVisibilityPolicies(): void {
    this.visibilityPolicyService.getAll().subscribe({
      next: (policies) => this.visibilityPolicies.set(policies),
      error: (error) => console.error('Error loading visibility policies:', error),
    });
  }

  private loadHistory(processId: string): void {
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

  toggleEventVisibility(event: { eventId: string; visibleToClient: boolean }): void {
    const current = this.process();
    if (!current) {
      return;
    }
    this.processEventsService.setEventVisibility(current.id, event.eventId, event.visibleToClient).subscribe({
      next: () => {
        this.processHistory.update((events) =>
          events.map((e) => (e.id === event.eventId ? { ...e, visibleToClient: event.visibleToClient } : e)),
        );
      },
      error: (error) => {
        console.error('Error al actualizar la visibilidad del evento:', error);
      },
    });
  }

  downloadFile(fileId: string): void {
    this.filesService.downloadFile(fileId).subscribe({
      error: (error) => {
        console.error('Error al descargar archivo:', error);
        this.toast.error(error.message || 'Error al descargar el archivo');
      },
    });
  }

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
        this.toast.error(error.message || 'Error al cargar vista previa del archivo');
      },
    });
  }

  closePreviewModal(): void {
    this.previewingFile.set(null);
    this.previewUrl.set(null);
  }

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

}
