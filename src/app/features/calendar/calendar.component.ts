import { Component, ViewChild, computed, inject, signal } from '@angular/core';
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
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import {
  CreateDeadlineRequest,
  DeadlineResponse,
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

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [ReactiveFormsModule, FullCalendarModule, RouterLink],
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
      </header>

      @if (processes().length === 0) {
        <div
          class="rounded-lg border border-default bg-warning-tint px-4 py-3 text-sm text-warning"
        >
          Aún no tienes procesos registrados. Crea un proceso en
          <a routerLink="/procesos" class="font-semibold underline">Procesos</a>
          antes de poder registrar plazos o audiencias.
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

    <!-- Modal de creación de plazo -->
    @if (createModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <form
          class="w-full max-w-lg grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          [formGroup]="createForm"
          (ngSubmit)="submitCreate()"
        >
          <h3 class="text-lg font-semibold text-text">
            Nuevo plazo o audiencia
          </h3>

          <label class="text-sm text-muted">
            Proceso *
            <select
              formControlName="processId"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              <option value="">Seleccionar proceso</option>
              @for (process of processes(); track process.id) {
                <option [value]="process.id">{{ process.title }}</option>
              }
            </select>
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Título *
              <input
                formControlName="title"
                type="text"
                placeholder="Ej. Audiencia de conciliación"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="text-sm text-muted">
              Tipo *
              <select
                formControlName="typeId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Seleccionar tipo</option>
                @for (type of deadlineTypes(); track type.id) {
                  <option [value]="type.id">{{ type.label }}</option>
                }
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Fecha y hora *
              <input
                formControlName="dueAt"
                type="datetime-local"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label
              class="mt-6 flex items-center gap-2 text-sm text-muted md:mt-8"
            >
              <input
                formControlName="allDay"
                type="checkbox"
                class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
              />
              Todo el día
            </label>
          </div>

          <label class="text-sm text-muted">
            Notas
            <textarea
              formControlName="notes"
              rows="2"
              placeholder="Detalles adicionales"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            ></textarea>
          </label>

          @if (advisors().length > 0) {
            <div class="text-sm text-muted">
              <label class="mb-2 block">Asignar a</label>
              <div
                class="max-h-32 overflow-y-auto rounded-md border border-default bg-surface-muted p-2 shadow-card"
              >
                <div class="space-y-1">
                  @for (advisor of advisors(); track advisor.id) {
                    @if (advisor.user) {
                      <label
                        class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-surface"
                      >
                        <input
                          type="checkbox"
                          [checked]="isAssigneeSelected(advisor.user.id)"
                          (change)="toggleAssignee(advisor.user.id)"
                          class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                        />
                        <span class="text-xs font-medium text-text">
                          {{ advisor.user.firstName }}
                          {{ advisor.user.lastName }}
                        </span>
                      </label>
                    }
                  }
                </div>
              </div>
            </div>
          }

          @if (createError()) {
            <p
              class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger"
            >
              {{ createError() }}
            </p>
          }

          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isCreating() || createForm.invalid"
            >
              Crear plazo
            </button>
            <button
              type="button"
              (click)="closeCreateModal()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class CalendarComponent {
  @ViewChild('calendar') calendarComponent?: FullCalendarComponent;

  private readonly fb = inject(FormBuilder);
  private readonly deadlinesService = inject(DeadlinesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogsService = inject(CatalogsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  readonly advisors = signal<AdvisorResponse[]>([]);
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

  protected readonly DeadlineStatus = DeadlineStatus;
  protected readonly formatDate = formatDate;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;

  readonly filterForm = this.fb.nonNullable.group({
    assignee: [''],
    type: [''],
    processId: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    processId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    typeId: ['', [Validators.required]],
    dueAt: ['', [Validators.required]],
    allDay: [false],
    notes: [''],
    assigneeUserIds: [[] as string[]],
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
    this.createError.set(null);
    this.createForm.reset({
      processId: '',
      title: '',
      typeId: '',
      dueAt: prefillDate ? this.toLocalDateTimeInput(prefillDate) : '',
      allDay: false,
      notes: '',
      assigneeUserIds: [],
    });
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
    this.createError.set(null);
  }

  private toLocalDateTimeInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  isAssigneeSelected(userId: string): boolean {
    const selectedIds = this.createForm.get('assigneeUserIds')?.value || [];
    return selectedIds.includes(userId);
  }

  toggleAssignee(userId: string): void {
    const currentIds = this.createForm.get('assigneeUserIds')?.value || [];
    const index = currentIds.indexOf(userId);

    if (index > -1) {
      this.createForm.patchValue({
        assigneeUserIds: currentIds.filter((id: string) => id !== userId),
      });
    } else {
      this.createForm.patchValue({ assigneeUserIds: [...currentIds, userId] });
    }
  }

  submitCreate(): void {
    if (this.isCreating()) {
      return;
    }

    const formValue = this.createForm.getRawValue();
    if (
      !formValue.processId ||
      !formValue.title ||
      !formValue.typeId ||
      !formValue.dueAt
    ) {
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
      notes: formValue.notes || undefined,
      assigneeUserIds: formValue.assigneeUserIds,
    };

    this.deadlinesService.create(formValue.processId, request).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.toast.success('Plazo creado correctamente.');
        this.closeCreateModal();
        this.calendarComponent?.getApi().refetchEvents();
      },
      error: (error) => {
        console.error('Error creating deadline:', error);
        this.createError.set(error.message || 'Error al crear el plazo');
        this.toast.error(error.message || 'Error al crear el plazo');
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
}
