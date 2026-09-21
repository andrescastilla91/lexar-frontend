import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ClientsService } from '../../core/services/clients.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { ClientResponse } from '../../core/models/client-backend.model';
import { CatalogsService } from '../../core/services/catalogs.service';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import { PermissionsService } from '../../core/services/permissions.service';
import { PaginationComponent } from '../../core/components/pagination.component';
import {
  LegalProcessResponse,
  ProcessStatus,
  CreateLegalProcessRequest,
} from '../../core/models/legal-process.model';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { ProcessesTableComponent } from './components/processes-table.component';
import { ProcessFormComponent } from './components/process-form.component';

/**
 * F40 Ola 4a: rediseño de /procesos — se reemplazan los 7 overlays que
 * este componente orquestaba sobre un `editingProcess` compartido
 * (formulario de edición, estado, historial, anotaciones, plazos, tareas,
 * contrapartes) por una ficha de detalle propia (`/procesos/:id` →
 * `ProcessDetailComponent`), mismo patrón que `clients.component.ts` →
 * `ClientDetailComponent`. Este componente ahora solo orquesta el listado,
 * los filtros y la creación (formulario recortado a los campos esenciales
 * — ver "Ola 4 (revisada)" en F40-ajustes-procesos-piloto.md); al guardar,
 * navega directo al detalle del proceso recién creado. Editar, cambiar
 * estado, contrapartes, plazos, tareas, anotaciones e historial viven ahora
 * en `ProcessDetailComponent`.
 */
@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [ReactiveFormsModule, PaginationComponent, ProcessesTableComponent, ProcessFormComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-2xl font-semibold text-text">
            Procesos judiciales y administrativos
          </h2>
          <p class="text-sm text-subtle">
            Monitorea etapas, responsables y niveles de riesgo procesal.
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Nuevo proceso
        </button>
      </header>

      <!-- Filtros (QA 2026-09-17: mismo patrón compacto y colapsable de
           clients.component.ts / users.component.ts — fila flex en vez de
           grid rígido, y colapsado por defecto en mobile, para que el
           panel de filtros no le quite protagonismo al listado a medida
           que F40 le suma más campos (tipo de proceso, etc.)). -->
      <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <button
          type="button"
          class="flex w-full items-center justify-between py-2 text-sm font-medium text-muted sm:hidden"
          [class.mb-4]="filtersOpen()"
          (click)="filtersOpen.set(!filtersOpen())"
        >
          <span>Filtros</span>
          <svg
            class="h-4 w-4 transition-transform"
            [class.rotate-180]="filtersOpen()"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <form
          class="space-y-4 sm:block"
          [class.hidden]="!filtersOpen()"
          [formGroup]="filterForm"
          (ngSubmit)="applyFilters()"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <label class="text-sm text-muted sm:min-w-[220px] sm:flex-1">
              <span class="mb-2 block">Búsqueda</span>
              <input
                formControlName="search"
                type="search"
                placeholder="Título, número de caso, descripción"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Estado</span>
              <select
                formControlName="status"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                <option [value]="ProcessStatus.DRAFT">Borrador</option>
                <option [value]="ProcessStatus.ACTIVE">Activo</option>
                <option [value]="ProcessStatus.UNDER_REVIEW">
                  En Revisión
                </option>
                <option [value]="ProcessStatus.SUSPENDED">Suspendido</option>
                <option [value]="ProcessStatus.COMPLETED">Completado</option>
                <option [value]="ProcessStatus.CANCELLED">Cancelado</option>
                <option [value]="ProcessStatus.ARCHIVED">Archivado</option>
              </select>
            </label>
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Cliente</span>
              <select
                formControlName="clientId"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                @for (client of clients(); track client.id) {
                  <option [value]="client.id">{{ client.fullName }}</option>
                }
              </select>
            </label>
            <!-- F34-b (rediseño 2026-09-17): el filtro por asunto concreto exigía
                 elegir cliente primero (los asuntos son por cliente) — se
                 reemplaza por el catálogo "Tipo de vinculación" (F25),
                 transversal a toda la empresa, sin esa dependencia. -->
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Tipo de vinculación</span>
              <select
                formControlName="contractTypeId"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                @for (contractType of contractTypes(); track contractType.id) {
                  <option [value]="contractType.id">{{ contractType.label }}</option>
                }
              </select>
            </label>
            <!-- F40 §PRO-04: filtro por tipo de proceso (catálogo process_type). -->
            <label class="w-full text-sm text-muted sm:w-48">
              <span class="mb-2 block">Tipo de proceso</span>
              <select
                formControlName="processTypeId"
                class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                @for (processType of processTypes(); track processType.id) {
                  <option [value]="processType.id">{{ processType.label }}</option>
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
      </div>

      <!-- Formulario de creación (F40 Ola 4a: recortado a lo esencial —
           editar vive ahora en la ficha de detalle del proceso). -->
      <app-process-form
        [form]="processForm"
        [isOpen]="panelOpen()"
        [isSubmitting]="isLoading()"
        [errorMessage]="formError()"
        [clients]="clients()"
        [advisors]="advisors()"
        [stages]="stages()"
        [riskLevels]="riskLevels()"
        [processTypes]="processTypes()"
        (close)="togglePanel()"
        (submit)="submitProcess()"
        (advisorIdsChange)="setAdvisorIds($event)"
      />

      <!-- Data Table -->
      <app-processes-table
        [processes]="processes()"
        [isLoading]="isLoading()"
        [hasFullAccess]="hasFullProcessAccess()"
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
export class ProcessesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly permissionsService = inject(PermissionsService);

  /** F36 (ola 5): si el usuario tiene legal_processes.view.all — gobierna el
   * texto explicativo en app-processes-table para quien no lo tiene, mismo
   * patrón que DocumentsComponent (F30). */
  readonly hasFullProcessAccess = computed(() =>
    this.permissionsService.hasPermission('legal_processes.view.all'),
  );

  // Exposed enums for template
  readonly ProcessStatus = ProcessStatus;

  // Signal state
  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly clients = signal<ClientResponse[]>([]);
  // F34-b: catálogo "Tipo de vinculación" (F25) para el filtro de /procesos —
  // transversal a toda la empresa, no depende de elegir un cliente primero.
  readonly contractTypes = signal<CatalogItem[]>([]);
  readonly processTypes = signal<CatalogItem[]>([]); // F40 §PRO-04
  readonly stages = signal<CatalogItem[]>([]);
  readonly riskLevels = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly panelOpen = signal(false);
  // QA 2026-09-17: mismo patrón mobile de clients.component.ts / users.component.ts
  // — panel de "Filtros" colapsado por defecto en mobile (sm:hidden en el botón,
  // sm:block en el form), para no competir con el listado por espacio.
  readonly filtersOpen = signal(false);
  readonly currentPage = signal(1);
  readonly totalItems = signal(0);

  readonly pageSize = 10;

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  // Forms
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: [null as ProcessStatus | null],
    clientId: [null as string | null],
    contractTypeId: [null as string | null],
    processTypeId: [null as string | null],
  });

  // F40 Ola 4a: recortado a los campos esenciales para abrir el expediente
  // (ver "Campos esenciales para la creación" en F40-ajustes-procesos-piloto.md).
  readonly processForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    clientId: ['', [Validators.required]],
    advisorIds: [[] as string[], []],
    status: [ProcessStatus.DRAFT, [Validators.required]],
    stageId: ['', [Validators.required]],
    riskLevelId: ['', [Validators.required]],
    processTypeId: ['', [Validators.required]],
  });

  constructor() {
    this.loadProcesses();
    this.loadAdvisors();
    this.loadClients();
    this.loadCatalogs();
  }

  ngOnInit(): void {
    this.redirectFromQueryParam();
  }

  loadProcesses(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();

    this.legalProcessesService
      .getLegalProcesses(this.currentPage(), this.pageSize, {
        status: filters.status || undefined,
        clientId: filters.clientId || undefined,
        contractTypeId: filters.contractTypeId || undefined,
        processTypeId: filters.processTypeId || undefined,
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

  loadCatalogs(): void {
    this.catalogsService.getActiveCatalog('process_stage').subscribe((items) => this.stages.set(items));
    this.catalogsService.getActiveCatalog('risk_level').subscribe((items) => this.riskLevels.set(items));
    // F34-b (rediseño): catálogo para el filtro "Tipo de vinculación".
    this.catalogsService.getActiveCatalog('contract_type').subscribe((items) => this.contractTypes.set(items));
    // F40 §PRO-04: catálogo para el campo/filtro "Tipo de proceso".
    this.catalogsService.getActiveCatalog('process_type').subscribe((items) => this.processTypes.set(items));
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
      contractTypeId: null,
      processTypeId: null,
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
      this.processForm.reset({
        title: '',
        clientId: '',
        advisorIds: [],
        status: ProcessStatus.DRAFT,
        stageId: '',
        riskLevelId: '',
        processTypeId: '',
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

    const request: CreateLegalProcessRequest = {
      title: formValue.title,
      clientId: formValue.clientId,
      // Se envía siempre el array real: omitirlo cuando queda vacío hace que el backend nunca toque la relación.
      advisorIds: formValue.advisorIds,
      status: ProcessStatus.DRAFT,
      stageId: formValue.stageId || undefined,
      riskLevelId: formValue.riskLevelId || undefined,
      processTypeId: formValue.processTypeId || undefined,
    };

    this.legalProcessesService.createLegalProcess(request).subscribe({
      next: (process) => {
        this.isLoading.set(false);
        this.togglePanel();
        // F40 Ola 4a: mismo patrón que clients.component.ts → navega directo
        // a la ficha de detalle del proceso recién creado, donde se
        // completan asunto, descripción, juzgado, radicado y fechas.
        this.router.navigate(['/procesos', process.id]);
      },
      error: (error) => {
        console.error('Error saving process:', error);
        // BUG-10: legalProcessesService ya envuelve el error en un Error
        // nativo con el mensaje real extraído (.message) — error.error no
        // existe ahí.
        const message = error.message || 'Error al guardar el proceso';
        this.formError.set(message);
        this.toast.error(message);
        this.isLoading.set(false);
      },
    });
  }

  // BUG-06 etapa 2: MultiSelectComponent (dentro de ProcessFormComponent)
  // emite el array completo de ids seleccionados en cada cambio.
  setAdvisorIds(advisorIds: string[]): void {
    this.processForm.patchValue({ advisorIds });
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
        // BUG-20: alert() nativo reemplazado por ToastService, leyendo
        // error.message (no error.error?.message).
        this.toast.error(error.message || 'Error al eliminar el proceso');
        this.isLoading.set(false);
      },
    });
  }

  /** F18/F40 Ola 4a — al llegar desde un resultado de búsqueda global o de
   * notificaciones (?openId=), redirige a la ficha de detalle del proceso
   * en vez de abrir un modal de edición (mismo patrón que
   * `clients.component.ts` → `redirectFromQueryParam()`). El backend genera
   * `linkPath: '/procesos?openId=<id>'` (search.service.ts / notifications)
   * sin cambios — solo este manejador cambia de "abrir modal" a "redirigir". */
  private redirectFromQueryParam(): void {
    const openId = this.route.snapshot.queryParamMap.get('openId');
    if (!openId) {
      return;
    }
    this.router.navigate(['/procesos', openId]);
  }
}
