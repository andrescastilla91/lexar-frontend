import { AfterViewInit, ChangeDetectionStrategy, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FullCalendarComponent,
  FullCalendarModule,
} from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { UsersService } from '../../core/services/users.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { CompanyService } from '../../core/services/company.service';
import { DeadlineFormModalComponent } from '../../shared/components/deadline-form-modal/deadline-form-modal.component';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { AssignableUser } from '../../core/models/user-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import {
  CreateDeadlineRequest,
  DeadlineResponse,
  DeadlineScope,
  DeadlineStatus,
} from '../../core/models/deadline.model';
import { LegalProcessResponse } from '../../core/models/legal-process.model';
import { getCatalogBadgeClasses } from '../../core/utils/catalog-badge.util';
import {
  getDeadlineEventColor,
  getDeadlineStatusClasses,
  getDeadlineStatusLabel,
} from '../../core/utils/deadline-format.util';
import { formatDate } from '../processes/utils/process-format.utils';

/**
 * F41 (ola 4, rediseño 2026-09-23): el modal de alta embebido (¡~400 líneas
 * de plantilla!) se reemplaza por <app-deadline-form-modal>, compartido con
 * la pestaña Plazos de ProcessDetailComponent — mismo formulario en los dos
 * sitios. Editar un plazo/evento ya no reutiliza este modal: navega a su
 * ficha dedicada (/calendario/plazos/:id, ver DeadlineDetailComponent), que
 * además es donde ahora vive Notas (ngx-editor) — sacarlo de este
 * componente resuelve por construcción el bug donde cada tecla perdía el
 * foco (nacía en el mismo componente que <full-calendar>, así que
 * disparaba su re-render sin importar OnPush; OnPush no aísla eventos que
 * nacen en su propio template).
 */
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [ReactiveFormsModule, FullCalendarModule, RouterLink, DeadlineFormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-2xl font-semibold text-text">Calendario legal</h2>
          <p class="text-sm text-subtle">
            Plazos y audiencias de todos los procesos del despacho.
          </p>
        </div>
        @if (canCreateDeadline()) {
          <button
            type="button"
            class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
            (click)="openCreateModal()"
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
            Nuevo plazo
          </button>
        }
      </header>

      @if (processes().length === 0) {
        <div
          class="rounded-lg border border-default bg-info-tint px-4 py-3 text-sm text-info"
        >
          Aún no tienes procesos registrados. Puedes crear un evento general
          (reunión, capacitación) sin proceso, o crear uno en
          <a routerLink="/procesos" class="font-semibold underline">Procesos</a>
          para registrar plazos y audiencias de un expediente.
        </div>
      }

      <!-- Filtros -->
      <form
        [formGroup]="filterForm"
        class="grid gap-4 rounded-lg border border-default bg-surface p-6 shadow-card md:grid-cols-4"
      >
        <div class="flex flex-col justify-end text-sm text-muted">
          <span class="mb-2 block">&nbsp;</span>
          <button
            type="button"
            (click)="toggleOnlyMine()"
            [disabled]="!currentUserId()"
            class="flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            [class]="
              onlyMine()
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-default text-text hover:bg-surface-muted'
            "
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
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
            Mis plazos
          </button>
        </div>
        <label class="text-sm text-muted">
          Asesor
          <select
            formControlName="assignee"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          >
            <option value="">Todos</option>
            @for (advisor of advisors(); track advisor.id) {
              @if (advisor.user) {
                <option [value]="advisor.user.id">
                  {{ advisor.user.firstName }} {{ advisor.user.lastName }}
                </option>
              }
            }
          </select>
        </label>
        <label class="text-sm text-muted">
          Tipo de plazo
          <select
            formControlName="type"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          >
            <option value="">Todos</option>
            @for (type of deadlineTypes(); track type.id) {
              <option [value]="type.id">{{ type.label }}</option>
            }
          </select>
        </label>
        <label class="text-sm text-muted">
          Proceso
          <select
            formControlName="processId"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          >
            <option value="">Todos</option>
            @for (process of processes(); track process.id) {
              <option [value]="process.id">{{ process.title }}</option>
            }
          </select>
        </label>
      </form>

      @if (!hasFullDeadlineAccess()) {
        <p class="rounded-md border border-default bg-surface-muted px-4 py-2.5 text-sm text-subtle">
          Ves los plazos y audiencias a tu cargo.
        </p>
      }

      <!-- Calendario -->
      <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
        <full-calendar #calendar [options]="calendarOptions" />
      </div>
    </div>

    <!-- Panel de detalle del plazo seleccionado -->
    @if (selectedDeadline(); as deadline) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div
          class="w-full max-w-md rounded-lg border border-default bg-surface p-6 shadow-2xl"
        >
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">
                {{ deadline.title }}
              </h3>
              <p class="text-sm text-subtle">{{ deadline.process?.title }}</p>
            </div>
            <button
              type="button"
              (click)="closeDetail()"
              class="rounded-md p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              @if (deadline.type) {
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-semibold"
                  [class]="getCatalogBadgeClasses(deadline.type.color)"
                >
                  {{ deadline.type.label }}
                </span>
              }
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                [class]="getDeadlineStatusClasses(deadline.status)"
              >
                {{ getDeadlineStatusLabel(deadline.status) }}
              </span>
            </div>
            <p class="text-sm text-text">{{ formatDate(deadline.dueAt) }}</p>
            @if (deadline.notes) {
              <p class="text-sm text-subtle">{{ deadline.notes }}</p>
            }
            @if (deadline.assignees.length > 0) {
              <p class="text-xs text-subtle">
                Asignado a:
                @for (assignee of deadline.assignees; track assignee.id) {
                  <span class="text-text"
                    >{{ assignee.firstName }} {{ assignee.lastName }}
                    @if (!$last) {
                      ,
                    }
                  </span>
                }
              </p>
            }
          </div>

          <div class="mt-6 flex gap-2">
            @if (canEditDeadline()) {
              <button
                type="button"
                (click)="goToEdit(deadline)"
                class="flex-1 rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
              >
                Editar
              </button>
            }
            @if (deadline.status === DeadlineStatus.PENDING) {
              <button
                type="button"
                (click)="markDone(deadline)"
                class="flex-1 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
              >
                Marcar completado
              </button>
            }
            <button
              type="button"
              (click)="deleteDeadline(deadline)"
              class="flex-1 rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-tint"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    }

    <app-deadline-form-modal
      [isOpen]="createModalOpen()"
      [isSubmitting]="isCreating()"
      [errorMessage]="createError()"
      [form]="createForm"
      [showProcessField]="true"
      [processes]="processes()"
      [deadlineTypes]="deadlineTypes()"
      [canCreateTeamScope]="canCreateTeamScope()"
      [assignableUsers]="assignableUsers()"
      [advisors]="advisors()"
      [relatedAdvisorUserIds]="relatedAdvisorUserIdsFor(createForm.get('processId')?.value)"
      (formCancel)="closeCreateModal()"
      (formSubmit)="submitCreate()"
      (assigneesChange)="onAssigneesChange($event)"
    />
  `,
})
export class CalendarComponent implements AfterViewInit {
  @ViewChild('calendar') calendarComponent?: FullCalendarComponent;

  private readonly fb = inject(FormBuilder);
  private readonly deadlinesService = inject(DeadlinesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogsService = inject(CatalogsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly usersService = inject(UsersService);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly companyService = inject(CompanyService);

  /** F36 (ola 5): si el usuario tiene deadlines.view.all — gobierna el texto
   * explicativo para quien no lo tiene, mismo patrón que DocumentsComponent
   * (F30). */
  readonly hasFullDeadlineAccess = computed(() =>
    this.permissionsService.hasPermission('deadlines.view.all'),
  );

  /** F41 §CAL-01: quién puede crear un evento general de alcance "todo el equipo". */
  readonly canCreateTeamScope = computed(() =>
    this.permissionsService.hasPermission('deadlines.create.team-scope'),
  );

  /** F41 (ola 4): sin este permiso ni el botón "Nuevo plazo" ni el click en
   * una fecha del calendario deben abrir el modal de creación — antes se
   * abría igual y solo fallaba al enviar, mostrando el error crudo del
   * backend (ver openCreateModal() y submitCreate()). */
  readonly canCreateDeadline = computed(() =>
    this.permissionsService.hasPermission('deadlines.create'),
  );

  /** F41 (ola 4): gatea el botón "Editar" del panel de detalle — sin este
   * permiso, `update()` en el backend ya lo rechaza igual, pero ocultarlo
   * evita el viaje de red que solo puede terminar en 403. */
  readonly canEditDeadline = computed(() =>
    this.permissionsService.hasPermission('deadlines.update'),
  );

  readonly advisors = signal<AdvisorResponse[]>([]);
  /** F41 (ola 4, correcciones #2): usuarios de la empresa (no solo
   * asesores) para "asignar a" en un evento general — un coordinador o
   * gerente puede no ser asesor. */
  readonly assignableUsers = signal<AssignableUser[]>([]);

  /** F41 (ola 4, correcciones #2): ids de usuario de los asesores ya
   * relacionados con el proceso elegido en el formulario de alta — para
   * priorizarlos en <app-deadline-form-modal> (marcados como "Asesor del
   * proceso") y para saber cuándo avisar que alguien no pertenece. No es un
   * `computed()` porque se llama con el valor de `createForm.get('processId')`
   * leído directamente en la plantilla, no una signal. */
  relatedAdvisorUserIdsFor(processId: string | null | undefined): string[] {
    if (!processId) {
      return [];
    }
    const process = this.processes().find((p) => p.id === processId);
    return (process?.advisors ?? []).map((advisor) => advisor.userId);
  }

  readonly deadlineTypes = signal<CatalogItem[]>([]);
  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly selectedDeadline = signal<DeadlineResponse | null>(null);
  readonly createModalOpen = signal(false);
  readonly isCreating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly onlyMine = signal(false);

  readonly currentUserId = computed(
    () => this.authService.currentUser()?.id ?? null,
  );

  readonly filterForm = this.fb.group({
    assignee: [''],
    type: [''],
    processId: [''],
  });

  /** F41 (ola 4, rediseño 2026-09-23): SOLO campos de alta — Notas, Cómputo
   * del término y Duración se completan en la ficha de edición
   * (/calendario/plazos/:id) tras crear, nunca aquí (ver
   * DeadlineFormModalComponent). */
  readonly createForm = this.fb.nonNullable.group({
    processId: [''],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    typeId: ['', [Validators.required]],
    dueAt: ['', [Validators.required]],
    allDay: [false],
    assigneeUserIds: [[] as string[]],
    scope: [DeadlineScope.ONLY_ME],
    blocksAgenda: [false],
  });

  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: esLocale,
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek',
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      list: 'Lista',
    },
    events: (fetchInfo, successCallback, failureCallback) => {
      const filters = this.filterForm.getRawValue();
      this.deadlinesService
        .getAll({
          from: fetchInfo.startStr,
          to: fetchInfo.endStr,
          assignee: filters.assignee || undefined,
          type: filters.type || undefined,
          processId: filters.processId || undefined,
        })
        .subscribe({
          next: (deadlines) =>
            successCallback(
              deadlines.map((deadline) => this.toEventInput(deadline)),
            ),
          error: (error) => {
            this.toast.error(
              error.message || 'Error al cargar el calendario de plazos',
            );
            failureCallback(error);
          },
        });
    },
    eventClick: (arg: EventClickArg) => {
      const deadline = arg.event.extendedProps['deadline'] as DeadlineResponse;
      this.selectedDeadline.set(deadline);
    },
    dateClick: (arg: DateClickArg) => {
      this.openCreateModal(arg.date);
    },
  };

  constructor() {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => this.advisors.set(response.advisors),
      error: (error) => console.error('Error loading advisors:', error),
    });
    this.usersService.getAssignableUsers().subscribe({
      next: (response) => this.assignableUsers.set(response.users),
      error: (error) => console.error('Error loading assignable users:', error),
    });
    this.catalogsService
      .getActiveCatalog('deadline_type')
      .subscribe((items) => this.deadlineTypes.set(items));
    this.legalProcessesService.getLegalProcesses(1, 100).subscribe({
      next: (response) => this.processes.set(response.legalProcesses),
      error: (error) => console.error('Error loading processes:', error),
    });

    this.openFromQueryParam();

    this.filterForm.valueChanges.subscribe((value) => {
      if (this.onlyMine() && value.assignee !== this.currentUserId()) {
        this.onlyMine.set(false);
      }
      this.calendarComponent?.getApi().refetchEvents();
    });

    // F41 (ola 4, correcciones): "todo el equipo" y "solo para mí" no
    // admiten seleccionar asistentes puntuales (solo "asesor seleccionado"
    // lo hace) — al cambiar a cualquiera de los dos se limpian los
    // asignados ya marcados, para que el estado del formulario no quede
    // desincronizado del multi-select oculto (ver DeadlineFormModalComponent).
    this.createForm.get('scope')?.valueChanges.subscribe((scope) => {
      if (scope !== DeadlineScope.SELECTED) {
        this.createForm.patchValue({ assigneeUserIds: [] });
      }
    });
  }

  /**
   * F41 §CAL-04 (ola 4): el horario laboral es solo un aviso NO bloqueante
   * (F41.md) — acá se usa únicamente para atenuar visualmente los días no
   * hábiles de la empresa en el calendario (`.fc-non-business`, estilo
   * nativo de FullCalendar), sin impedir nada. `businessHours` de
   * FullCalendar usa 0=domingo..6=sábado; la empresa guarda ISO 8601
   * (1=lunes..7=domingo, ver Company entity). Se aplica en
   * `ngAfterViewInit` (no en el constructor) para garantizar que
   * `calendarComponent` ya esté resuelto por el `@ViewChild` cuando la
   * respuesta del backend llegue, sin depender de qué tan rápido resuelva.
   */
  ngAfterViewInit(): void {
    this.companyService.getCompany().subscribe({
      next: (company) => {
        const daysOfWeek = (company.workingDays ?? [1, 2, 3, 4, 5]).map(
          (isoDay) => (isoDay === 7 ? 0 : isoDay),
        );
        this.calendarComponent
          ?.getApi()
          .setOption('businessHours', { daysOfWeek, startTime: '00:00', endTime: '24:00' });
      },
      error: () => {},
    });
  }

  /** F18 — al llegar desde un resultado de búsqueda global (?openId=), abre
   * el detalle de ese plazo/audiencia directamente, sin depender de que el
   * calendario ya lo haya renderizado en el rango visible. */
  private openFromQueryParam(): void {
    const openId = this.route.snapshot.queryParamMap.get('openId');
    if (!openId) {
      return;
    }
    this.deadlinesService.getOne(openId).subscribe({
      next: (deadline) => this.selectedDeadline.set(deadline),
      error: () => {},
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  toggleOnlyMine(): void {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    const next = !this.onlyMine();
    this.onlyMine.set(next);
    this.filterForm.patchValue({ assignee: next ? userId : '' });

    if (next) {
      this.calendarComponent?.getApi().changeView('listWeek');
    }
  }

  private toEventInput(deadline: DeadlineResponse): EventInput {
    const color = getDeadlineEventColor(deadline.type?.color);
    return {
      id: deadline.id,
      title: deadline.title,
      start: deadline.dueAt,
      allDay: deadline.allDay,
      backgroundColor: color,
      borderColor: color,
      classNames:
        deadline.status === DeadlineStatus.DONE
          ? ['opacity-60', 'line-through']
          : [],
      extendedProps: { deadline },
    };
  }

  closeDetail(): void {
    this.selectedDeadline.set(null);
  }

  markDone(deadline: DeadlineResponse): void {
    this.deadlinesService
      .update(deadline.id, { status: DeadlineStatus.DONE })
      .subscribe({
        next: () => {
          this.toast.success('Plazo marcado como completado.');
          this.closeDetail();
          this.calendarComponent?.getApi().refetchEvents();
        },
        error: (error) => {
          console.error('Error updating deadline:', error);
          this.toast.error(error.message || 'Error al actualizar el plazo');
        },
      });
  }

  openCreateModal(prefillDate?: Date): void {
    if (!this.canCreateDeadline()) {
      this.toast.error('No tienes permiso para crear plazos o eventos.');
      return;
    }
    this.createError.set(null);
    this.createForm.reset({
      processId: '',
      title: '',
      typeId: '',
      dueAt: prefillDate ? this.toLocalDateTimeInput(prefillDate) : '',
      allDay: false,
      assigneeUserIds: [],
      scope: DeadlineScope.ONLY_ME,
      blocksAgenda: false,
    });
    this.createModalOpen.set(true);
  }

  /** F41 (ola 4, rediseño 2026-09-23): "editar" ya no reutiliza el modal de
   * alta — navega a la ficha dedicada, que además es donde ahora viven
   * Notas, Cómputo del término y Duración. */
  goToEdit(deadline: DeadlineResponse): void {
    if (!this.canEditDeadline()) {
      this.toast.error('No tienes permiso para editar plazos o eventos.');
      return;
    }
    this.closeDetail();
    this.router.navigate(['/calendario/plazos', deadline.id], {
      queryParams: { returnTo: 'calendario' },
    });
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
    this.createError.set(null);
  }

  private toLocalDateTimeInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /** F41 (ola 4): reemplaza isAssigneeSelected()/toggleAssignee() — ahora
   * el `app-multi-select` (BUG-06), dentro de DeadlineFormModalComponent,
   * es dueño de su propio estado de UI y solo emite la lista final de ids
   * seleccionados. */
  /** F41 (ola 4, correcciones #2): si el evento pertenece a un proceso y se
   * agrega a alguien que no está entre sus asesores relacionados, se avisa
   * antes de aplicar la selección — no se bloquea, solo se confirma. */
  async onAssigneesChange(userIds: string[]): Promise<void> {
    const processId = this.createForm.get('processId')?.value;
    const previousIds: string[] = this.createForm.get('assigneeUserIds')?.value || [];
    const addedIds = userIds.filter((id) => !previousIds.includes(id));

    if (processId && addedIds.length > 0) {
      const relatedIds = new Set(this.relatedAdvisorUserIdsFor(processId));
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
          this.createForm.patchValue({ assigneeUserIds: previousIds });
          return;
        }
      }
    }

    this.createForm.patchValue({ assigneeUserIds: userIds });
  }

  submitCreate(): void {
    if (this.isCreating()) {
      return;
    }

    const formValue = this.createForm.getRawValue();
    if (!formValue.title || !formValue.typeId || !formValue.dueAt) {
      this.createForm.markAllAsTouched();
      this.createError.set('Completa los campos obligatorios.');
      return;
    }

    this.isCreating.set(true);
    this.createError.set(null);

    const request: CreateDeadlineRequest = {
      title: formValue.title,
      typeId: formValue.typeId,
      dueAt: new Date(formValue.dueAt).toISOString(),
      allDay: formValue.allDay,
      assigneeUserIds: formValue.assigneeUserIds,
    };

    // F41 §CAL-01: sin proceso, el evento es general — scope/blocksAgenda
    // solo tienen sentido en ese caso.
    const creation$ = formValue.processId
      ? this.deadlinesService.create(formValue.processId, request)
      : this.deadlinesService.createGeneral({
          ...request,
          scope: formValue.scope,
          blocksAgenda: formValue.blocksAgenda,
        });

    creation$.subscribe({
      next: (created) => {
        this.isCreating.set(false);
        this.toast.success(
          formValue.processId
            ? 'Plazo creado correctamente.'
            : 'Evento creado correctamente.',
        );
        this.closeCreateModal();
        // F41 (ola 4, rediseño 2026-09-23): mismo patrón que
        // UserFormComponent/ProcessFormComponent — al crear, se navega
        // directo a la ficha de detalle, donde se completan Notas, Cómputo
        // del término y Duración.
        this.router.navigate(['/calendario/plazos', created.id], {
          queryParams: { returnTo: 'calendario' },
        });
      },
      error: (error) => {
        console.error('Error creating deadline:', error);
        // F41 (ola 4): defensa adicional si el permiso se revocó justo
        // entre abrir el modal (ya gateado por canCreateDeadline()) y
        // enviar el formulario — nunca mostrar el mensaje crudo del guard.
        const message =
          error.status === 403
            ? 'No tienes permiso para crear plazos o eventos.'
            : error.message || 'Error al crear el plazo';
        this.createError.set(message);
        this.toast.error(message);
        this.isCreating.set(false);
      },
    });
  }

  async deleteDeadline(deadline: DeadlineResponse): Promise<void> {
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
        this.closeDetail();
        this.calendarComponent?.getApi().refetchEvents();
      },
      error: (error) => {
        console.error('Error deleting deadline:', error);
        this.toast.error(error.message || 'Error al eliminar el plazo');
      },
    });
  }

  protected readonly DeadlineStatus = DeadlineStatus;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;
  protected readonly formatDate = formatDate;
}
