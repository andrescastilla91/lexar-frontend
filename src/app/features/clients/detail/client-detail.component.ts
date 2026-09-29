import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientsService } from '../../../core/services/clients.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { TasksService } from '../../../core/services/tasks.service';
import {
  ClientResponse,
  ClientPersonType,
  ClientMatterStatus,
  UpdateClientRequest,
  UpdateClientComplianceRequest,
} from '../../../core/models/client-backend.model';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { TaskResponse } from '../../../core/models/task.model';
import { EntityFilesComponent } from '../../../core/components/entity-files.component';
import { ClientPortalInvitationsComponent } from '../../../core/components/client-portal-invitations.component';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { ToastService } from '../../../core/services/toast.service';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';
import { identificationNumberValidator } from '../utils/identification-number.validator';
import { ClientContactsPanelComponent } from './components/client-contacts-panel.component';
import { ClientMattersPanelComponent } from './components/client-matters-panel.component';
import { getStatusClasses, getStatusLabel } from '../../processes/utils/process-format.utils';
// F34-b: mismo badge de vigencia que ya usa la pestaña Asuntos.
import { matterStatusClasses, matterStatusLabel } from '../../../core/utils/matter-format.util';

type ClientDetailTab =
  | 'datos'
  | 'contactos'
  | 'asuntos'
  | 'procesos'
  | 'tareas'
  | 'documentos'
  | 'portal'
  | 'cumplimiento';

/**
 * F33 §6/F34 §4: ficha del cliente con pestañas. Datos/Cumplimiento
 * comparten un único formulario (misma entidad `Client`); Contactos,
 * Asuntos, Procesos, Tareas y Documentos cargan su propia fuente de datos.
 */
@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HasPermissionDirective,
    MultiSelectComponent,
    EntityFilesComponent,
    ClientPortalInvitationsComponent,
    ClientContactsPanelComponent,
    ClientMattersPanelComponent,
  ],
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (!client()) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">Cliente no encontrado</p>
        <a routerLink="/clientes" class="mt-4 inline-block text-sm font-semibold text-navy-900">Volver al listado</a>
      </div>
    } @else {
      <div class="space-y-6">
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a routerLink="/clientes" class="text-xs font-medium text-subtle hover:text-muted">&larr; Clientes</a>
            <h2 class="text-2xl font-semibold text-text">{{ client()!.fullName }}</h2>
            <p class="text-sm text-subtle">
              {{ client()!.personType === 'JURIDICA' ? 'Persona jurídica' : 'Persona natural' }} ·
              {{ client()!.documentType?.label || 'N/A' }}: {{ client()!.identificationNumber }}
            </p>
          </div>
          <span
            class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
            [class]="client()!.isActive ? 'bg-success-tint text-success' : 'bg-surface-muted text-muted'"
          >
            {{ client()!.isActive ? 'Activo' : 'Inactivo' }}
          </span>
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
            <form [formGroup]="editForm" (ngSubmit)="saveClient()" class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
              @if (!canEditBasicData()) {
                <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
                  No tienes permiso para editar los datos del cliente.
                </div>
              }

              <div class="flex gap-4 text-sm text-muted">
                <label class="flex items-center gap-2">
                  <input type="radio" formControlName="personType" value="NATURAL" />
                  Persona natural
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" formControlName="personType" value="JURIDICA" />
                  Persona jurídica
                </label>
              </div>

              <div class="grid gap-4 lg:grid-cols-2">
                <label class="block text-sm text-muted">
                  {{ isJuridica() ? 'Razón social *' : 'Nombre completo *' }}
                  <input
                    formControlName="fullName"
                    type="text"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                </label>

                <label class="text-sm text-muted">
                  Tipo de documento *
                  <select
                    formControlName="documentTypeId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    @for (documentType of documentTypesForPersonType(); track documentType.id) {
                      <option [value]="documentType.id">{{ documentType.label }}</option>
                    }
                  </select>
                </label>

                <label class="text-sm text-muted">
                  Número de identificación *
                  <input
                    formControlName="identificationNumber"
                    type="text"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  />
                  @if (editForm.errors?.['invalidNit']) {
                    <p class="mt-1 text-xs text-danger">{{ editForm.errors?.['invalidNit'] }}</p>
                  }
                  @if (editForm.errors?.['invalidCedula']) {
                    <p class="mt-1 text-xs text-danger">{{ editForm.errors?.['invalidCedula'] }}</p>
                  }
                </label>

                <label class="block text-sm text-muted">
                  Dirección
                  <textarea
                    formControlName="address"
                    rows="3"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  ></textarea>
                </label>
              </div>

              @if (canEditBasicData()) {
                <app-multi-select
                  [items]="advisorItems()"
                  [selectedIds]="editForm.get('advisorIds')?.value || []"
                  label="Asesores responsables"
                  placeholder="Buscar asesor…"
                  emptyStateText="No hay asesores disponibles"
                  (selectionChange)="editForm.patchValue({ advisorIds: $event })"
                />
              }

              @if (errorMessage()) {
                <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  {{ errorMessage() }}
                </div>
              }

              <button
                *hasPermission="'clients.edit'"
                type="submit"
                class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving() || editForm.invalid"
              >
                Guardar cambios
              </button>
            </form>
          }
          @case ('cumplimiento') {
            <form [formGroup]="editForm" (ngSubmit)="saveClient()" class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
              @if (!canEditCompliance()) {
                <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
                  No tienes permiso para editar el nivel de criticidad ni el riesgo LA/FT del cliente.
                </div>
              }

              <div class="grid gap-4 lg:grid-cols-2">
                <label class="block text-sm text-muted">
                  Nivel de criticidad
                  <select
                    formControlName="riskLevelId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    @for (riskLevel of riskLevels(); track riskLevel.id) {
                      <option [value]="riskLevel.id">{{ riskLevel.label }}</option>
                    }
                  </select>
                </label>

                <label class="block text-sm text-muted">
                  Riesgo LA/FT
                  <select
                    formControlName="laftRiskId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
                  >
                    <option value="">Sin definir</option>
                    @for (laftRisk of laftRisks(); track laftRisk.id) {
                      <option [value]="laftRisk.id">{{ laftRisk.label }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
                Autorización de tratamiento de datos personales — se habilita en F44 (LEG-02).
              </div>

              @if (errorMessage()) {
                <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  {{ errorMessage() }}
                </div>
              }

              <button
                *hasPermission="'clients.edit-compliance'"
                type="submit"
                class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving()"
              >
                Guardar cambios
              </button>
            </form>
          }
          @case ('contactos') {
            <app-client-contacts-panel [clientId]="client()!.id" />
          }
          @case ('asuntos') {
            <app-client-matters-panel [clientId]="client()!.id" />
          }
          @case ('procesos') {
            <div class="rounded-lg border border-default bg-surface shadow-card">
              @if (isLoadingProcesses()) {
                <div class="flex items-center justify-center py-12">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                </div>
              } @else if (processes().length === 0) {
                <p class="p-6 text-sm text-subtle">Este cliente no tiene procesos registrados.</p>
              } @else {
                <ul class="divide-y divide-default">
                  @for (process of processes(); track process.id) {
                    <li class="flex items-center justify-between gap-4 p-4">
                      <div>
                        <a [routerLink]="['/procesos', process.id]" class="font-medium text-text hover:text-navy-900">
                          {{ process.title }}
                        </a>
                        <p class="text-xs text-subtle">{{ process.caseNumber || 'Sin radicado' }}</p>
                        <!-- F34-b: asunto vinculado, visible sin abrir el proceso -->
                        @if (process.matter) {
                          <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                            <span>{{ process.matter.name }}</span>
                            @if (process.matter.isDeleted) {
                              <span class="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-subtle">
                                Eliminado
                              </span>
                            } @else if (process.matter.status === ClientMatterStatus.VENCIDO) {
                              <span
                                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                [class]="matterStatusClasses(process.matter.status)"
                              >
                                {{ matterStatusLabel(process.matter.status) }}
                              </span>
                            }
                          </p>
                        } @else {
                          <p class="mt-0.5 text-xs text-subtle">Sin asunto</p>
                        }
                      </div>
                      <span
                        class="inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
                        [class]="getStatusClasses(process.status)"
                      >
                        {{ getStatusLabel(process.status) }}
                      </span>
                    </li>
                  }
                </ul>
              }
            </div>
          }
          @case ('tareas') {
            <div class="rounded-lg border border-default bg-surface shadow-card">
              @if (isLoadingTasks()) {
                <div class="flex items-center justify-center py-12">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                </div>
              } @else if (tasks().length === 0) {
                <p class="p-6 text-sm text-subtle">Este cliente no tiene tareas asociadas a sus procesos.</p>
              } @else {
                <ul class="divide-y divide-default">
                  @for (task of tasks(); track task.id) {
                    <li class="p-4">
                      <a [routerLink]="['/tareas']" [queryParams]="{ openId: task.id }" class="font-medium text-text hover:text-navy-900">
                        {{ task.title }}
                      </a>
                      <p class="text-xs text-subtle">
                        {{ task.status.label }} · {{ task.process?.title || 'Sin proceso' }}
                      </p>
                    </li>
                  }
                </ul>
              }
            </div>
          }
          @case ('documentos') {
            <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <app-entity-files entityType="client" [entityId]="client()!.id" />
            </div>
          }
          @case ('portal') {
            <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <app-client-portal-invitations [clientId]="client()!.id" />
            </div>
          }
        }
      </div>
    }
  `,
})
export class ClientDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly tasksService = inject(TasksService);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionsService);

  readonly tabs: { id: ClientDetailTab; label: string }[] = [
    { id: 'datos', label: 'Datos' },
    { id: 'contactos', label: 'Contactos' },
    { id: 'asuntos', label: 'Asuntos' },
    { id: 'procesos', label: 'Procesos' },
    { id: 'tareas', label: 'Tareas' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'portal', label: 'Portal' },
    { id: 'cumplimiento', label: 'Cumplimiento' },
  ];
  readonly activeTab = signal<ClientDetailTab>('datos');

  readonly client = signal<ClientResponse | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly documentTypes = signal<CatalogItem[]>([]);
  readonly riskLevels = signal<CatalogItem[]>([]);
  readonly laftRisks = signal<CatalogItem[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);

  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly isLoadingProcesses = signal(false);
  readonly tasks = signal<TaskResponse[]>([]);
  readonly isLoadingTasks = signal(false);

  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClasses = getStatusClasses;
  protected readonly matterStatusLabel = matterStatusLabel;
  protected readonly matterStatusClasses = matterStatusClasses;
  protected readonly ClientMatterStatus = ClientMatterStatus;

  readonly editForm = this.fb.nonNullable.group(
    {
      personType: [ClientPersonType.NATURAL],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      address: [''],
      documentTypeId: ['', [Validators.required]],
      identificationNumber: ['', [Validators.required]],
      riskLevelId: [''],
      laftRiskId: [''],
      advisorIds: [[] as string[]],
    },
    {
      validators: [identificationNumberValidator(() => this.documentTypes())],
    },
  );

  /** `computed()` solo reacciona a lecturas de signal — un `FormControl.value`
   * leído directo no dispara recálculo. Se puentea `valueChanges` a una
   * signal real para que `isJuridica`/`documentTypesForPersonType` sí
   * reaccionen al cambiar el radio Natural/Jurídica. */
  private readonly personTypeValue = toSignal(
    this.editForm.get('personType')!.valueChanges.pipe(
      startWith(this.editForm.get('personType')!.value),
    ),
    { initialValue: ClientPersonType.NATURAL },
  );

  readonly isJuridica = computed(() => this.personTypeValue() === ClientPersonType.JURIDICA);

  readonly documentTypesForPersonType = computed(() => {
    const personType = this.personTypeValue();
    return this.documentTypes().filter(
      (item) => !item.personTypeScope || item.personTypeScope === personType,
    );
  });

  // QA F33 2026-09-14: los campos de Datos/Cumplimiento se deshabilitan
  // (no solo se oculta el botón) cuando falta el permiso correspondiente,
  // con un aviso inline — antes quedaban editables sin explicación hasta
  // que el backend rechazaba el guardado.
  readonly canEditBasicData = computed(() => this.permissions.hasPermission('clients.edit'));
  readonly canEditCompliance = computed(() => this.permissions.hasPermission('clients.edit-compliance'));

  readonly advisorItems = computed<MultiSelectItem[]>(() =>
    this.advisors().map((advisor) => ({
      id: advisor.id,
      label: `${advisor.user?.firstName ?? ''} ${advisor.user?.lastName ?? ''}`.trim(),
      description: advisor.specialties?.[0]?.label || 'N/A',
    })),
  );

  // QA F33 2026-09-14: `[attr.disabled]` en el template no funciona sobre
  // controles con formControlName — Reactive Forms reescribe la propiedad
  // `disabled` nativa para que coincida con el estado real del FormControl
  // en cada ciclo de detección de cambios, así que el atributo de plantilla
  // quedaba pisado. El deshabilitado real tiene que hacerse sobre el
  // FormControl mismo.
  private readonly basicDataFieldNames = ['personType', 'fullName', 'address', 'documentTypeId', 'identificationNumber'] as const;
  private readonly complianceFieldNames = ['riskLevelId', 'laftRiskId'] as const;

  constructor() {
    effect(() => {
      const canEditBasicData = this.canEditBasicData();
      for (const name of this.basicDataFieldNames) {
        const control = this.editForm.get(name);
        if (!control) continue;
        if (canEditBasicData) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
      }
    });
    effect(() => {
      const canEditCompliance = this.canEditCompliance();
      for (const name of this.complianceFieldNames) {
        const control = this.editForm.get(name);
        if (!control) continue;
        if (canEditCompliance) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }
    this.loadCatalogs();
    this.loadAdvisors();
    this.loadClient(id);
  }

  private loadCatalogs(): void {
    this.catalogsService.getActiveCatalog('document_type').subscribe((items) => this.documentTypes.set(items));
    this.catalogsService.getActiveCatalog('risk_level').subscribe((items) => this.riskLevels.set(items));
    this.catalogsService.getActiveCatalog('laft_risk').subscribe((items) => this.laftRisks.set(items));
  }

  private loadAdvisors(): void {
    this.advisorsService.getAdvisors(1, 100, { isActive: true }).subscribe((response) => this.advisors.set(response.advisors || []));
  }

  private loadClient(id: string): void {
    this.isLoading.set(true);
    this.clientsService.getClient(id).subscribe({
      next: (client) => {
        this.client.set(client);
        this.editForm.patchValue({
          personType: client.personType,
          fullName: client.fullName,
          address: client.address || '',
          documentTypeId: client.documentType?.id || '',
          identificationNumber: client.identificationNumber,
          riskLevelId: client.riskLevel?.id || '',
          laftRiskId: client.laftRisk?.id || '',
          advisorIds: client.advisors?.map((a) => a.id) || [],
        });
        this.isLoading.set(false);
        this.loadProcesses(id);
      },
      error: () => {
        this.client.set(null);
        this.isLoading.set(false);
      },
    });
  }

  private loadProcesses(clientId: string): void {
    this.isLoadingProcesses.set(true);
    this.legalProcessesService.getLegalProcesses(1, 100, { clientId }).subscribe({
      next: (response) => {
        const processes = response.legalProcesses || [];
        this.processes.set(processes);
        this.isLoadingProcesses.set(false);
        this.loadTasks(processes);
      },
      error: () => {
        this.processes.set([]);
        this.isLoadingProcesses.set(false);
      },
    });
  }

  /** No hay filtro directo de tareas por cliente (F42 aún no existe) — se
   * agregan las tareas de cada proceso del cliente. */
  private loadTasks(processes: LegalProcessResponse[]): void {
    if (processes.length === 0) {
      this.tasks.set([]);
      return;
    }
    this.isLoadingTasks.set(true);
    const requests = processes.map((p) => this.tasksService.getForProcess(p.id));
    let remaining = requests.length;
    const collected: TaskResponse[] = [];
    requests.forEach((request) => {
      request.subscribe({
        next: (tasks) => {
          collected.push(...tasks);
          remaining -= 1;
          if (remaining === 0) {
            this.tasks.set(collected);
            this.isLoadingTasks.set(false);
          }
        },
        error: () => {
          remaining -= 1;
          if (remaining === 0) {
            this.tasks.set(collected);
            this.isLoadingTasks.set(false);
          }
        },
      });
    });
  }

  saveClient(): void {
    const currentClient = this.client();
    if (!currentClient || this.isSaving()) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      // Datos y Cumplimiento comparten `editForm` — si el campo inválido
      // vive en Datos y el usuario está en Cumplimiento, no vería ningún
      // error sin este toast + salto de pestaña.
      this.toast.error('Hay campos obligatorios sin completar en la pestaña Datos');
      this.activeTab.set('datos');
      return;
    }

    // QA F33 2026-09-14: Datos y Cumplimiento comparten `editForm` para el
    // binding, pero se guardan contra endpoints distintos — cada uno
    // gateado por su propio permiso (clients.edit / clients.edit-compliance).
    if (this.activeTab() === 'cumplimiento') {
      this.saveCompliance(currentClient.id);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const formValue = this.editForm.getRawValue();

    const updateData: UpdateClientRequest = {
      personType: formValue.personType,
      fullName: formValue.fullName,
      address: formValue.address || undefined,
      documentTypeId: formValue.documentTypeId || undefined,
      identificationNumber: formValue.identificationNumber,
      advisorIds: formValue.advisorIds,
    };

    this.clientsService.updateClient(currentClient.id, updateData).subscribe({
      next: (client) => {
        this.client.set(client);
        this.isSaving.set(false);
        this.toast.success('Cliente actualizado exitosamente');
      },
      error: (error) => {
        const message = error.message || 'Error al actualizar cliente';
        this.errorMessage.set(message);
        this.toast.error(message);
        this.isSaving.set(false);
      },
    });
  }

  private saveCompliance(clientId: string): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    const formValue = this.editForm.getRawValue();

    const updateData: UpdateClientComplianceRequest = {
      riskLevelId: formValue.riskLevelId || undefined,
      laftRiskId: formValue.laftRiskId || undefined,
    };

    this.clientsService.updateClientCompliance(clientId, updateData).subscribe({
      next: (client) => {
        this.client.set(client);
        this.isSaving.set(false);
        this.toast.success('Cliente actualizado exitosamente');
      },
      error: (error) => {
        const message = error.message || 'Error al actualizar cliente';
        this.errorMessage.set(message);
        this.toast.error(message);
        this.isSaving.set(false);
      },
    });
  }
}
