import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { DeadlinesService } from '../../../core/services/deadlines.service';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';
import { UsersService } from '../../../core/services/users.service';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { AssignableUser } from '../../../core/models/user-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import {
  DeadlineComputationType,
  DeadlineResponse,
  DeadlineScope,
  DeadlineStatus,
  UpdateDeadlineRequest,
} from '../../../core/models/deadline.model';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { getDeadlineStatusClasses, getDeadlineStatusLabel } from '../../../core/utils/deadline-format.util';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';

/**
 * F41 (ola 4, rediseño 2026-09-23): ficha de edición de un plazo/evento,
 * nueva — antes no existía, todo vivía en modales (uno en Calendario, otro
 * distinto en la pestaña Plazos de Procesos). Mismo patrón de
 * Usuarios/Clientes/Procesos: modal de alta mínimo (DeadlineFormModalComponent)
 * + esta ficha de edición en su propia ruta.
 *
 * Notas es un <textarea> plano, no ngx-editor (decisión 2026-09-23): se
 * intentó primero con ngx-editor, incluso separando esta vista de
 * FullCalendar por completo (la hipótesis original — que el bug de foco
 * dependía de convivir con <full-calendar> — resultó incorrecta, el mismo
 * problema reapareció aquí sin FullCalendar de por medio). No se llegó a
 * una causa raíz concluyente solo con lectura de código, y el usuario
 * decidió no bloquear el resto de la feature por esto: se vuelve a texto
 * plano, que sí funciona, y queda pendiente evaluar ngx-editor (u otra
 * librería) en un ciclo aparte si se necesita texto enriquecido.
 *
 * "Volver" respeta el origen: query params returnTo=calendario|proceso
 * (+processId), mismo mecanismo de query params que ?openId= en
 * CalendarComponent/TasksComponent.
 */
@Component({
  selector: 'app-deadline-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (!deadline()) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">Plazo no encontrado</p>
        <a routerLink="/calendario" class="mt-4 inline-block text-sm font-semibold text-navy-900">Volver al calendario</a>
      </div>
    } @else {
      <div class="space-y-6">
        <header class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a [routerLink]="backLink()" [queryParams]="backQueryParams()" class="text-xs font-medium text-subtle hover:text-muted">&larr; {{ backLabel() }}</a>
            <h2 class="text-2xl font-semibold text-text">{{ deadline()!.title }}</h2>
            <p class="text-sm text-subtle">{{ deadline()!.process?.title || 'Evento general' }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @if (deadline()!.type; as type) {
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getCatalogBadgeClasses(type.color)">
                {{ type.label }}
              </span>
            }
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getDeadlineStatusClasses(deadline()!.status)">
              {{ getDeadlineStatusLabel(deadline()!.status) }}
            </span>
          </div>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-6 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-card">
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label class="text-sm text-muted">
              Título *
              <input
                formControlName="title"
                type="text"
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
            <label class="text-sm text-muted">
              Fecha y hora *
              <input
                formControlName="dueAt"
                type="datetime-local"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <label class="flex items-center gap-2 text-sm text-muted md:self-end md:pb-2.5">
              <input
                formControlName="allDay"
                type="checkbox"
                class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
              />
              Todo el día
            </label>
            <label class="text-sm text-muted">
              Duración
              <div class="mt-2 flex gap-2">
                <input
                  formControlName="durationValue"
                  type="number"
                  min="1"
                  [attr.disabled]="form.get('allDay')?.value ? true : null"
                  placeholder="Ej. 30"
                  class="w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <select
                  formControlName="durationUnit"
                  [attr.disabled]="form.get('allDay')?.value ? true : null"
                  class="w-32 rounded-md border border-default px-2 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="MINUTES">Minutos</option>
                  <option value="HOURS">Horas</option>
                </select>
              </div>
            </label>
            @if (deadline()!.processId) {
              <label class="text-sm text-muted">
                Cómputo del término
                <select
                  formControlName="computationType"
                  class="mt-2 w-full rounded-md border border-default px-3 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  <option [value]="DeadlineComputationType.BUSINESS_DAYS">Días hábiles</option>
                  <option [value]="DeadlineComputationType.CALENDAR_DAYS">Días calendario</option>
                </select>
                <p class="mt-1 text-xs text-subtle">Hábiles (excluye fines de semana y festivos) o calendario.</p>
              </label>
            }
          </div>

          <!-- Asignación: el proceso de un plazo ya existente no cambia al
               editar, así que a diferencia del modal de alta esta sección
               no necesita ser "estable ante reactividad" — su forma queda
               fija según el plazo cargado. -->
          <div class="grid gap-4 rounded-lg border border-default bg-surface-muted p-4">
            <h4 class="text-sm font-semibold text-text">Asignación</h4>

            @if (!deadline()!.processId) {
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Alcance
                  <select
                    formControlName="scope"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option [value]="DeadlineScope.ONLY_ME">Solo para mí</option>
                    <option [value]="DeadlineScope.SELECTED">Para asesores seleccionados</option>
                    @if (canCreateTeamScope()) {
                      <option [value]="DeadlineScope.TEAM">Para todo el equipo</option>
                    }
                  </select>
                </label>
                <label class="mt-6 flex items-center gap-2 text-sm text-muted md:mt-8">
                  <input
                    formControlName="blocksAgenda"
                    type="checkbox"
                    class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                  />
                  Bloquear la agenda de los participantes
                </label>
              </div>

              @if (form.get('scope')?.value === DeadlineScope.TEAM) {
                <p class="text-sm text-subtle">Este evento alcanza a todo el equipo — no aplica seleccionar asistentes puntuales.</p>
              } @else if (form.get('scope')?.value === DeadlineScope.SELECTED) {
                <app-multi-select
                  [items]="assignmentItems()"
                  [selectedIds]="form.get('assigneeUserIds')?.value || []"
                  label="Asignar a"
                  placeholder="Buscar usuario…"
                  emptyStateText="Ningún usuario coincide"
                  (selectionChange)="onAssigneesChange($event)"
                />
              } @else {
                <p class="text-sm text-subtle">Este evento queda asignado solo a ti.</p>
              }
            } @else if (assignmentItems().length > 0) {
              <app-multi-select
                [items]="assignmentItems()"
                [selectedIds]="form.get('assigneeUserIds')?.value || []"
                label="Asignar a"
                placeholder="Buscar asesor…"
                emptyStateText="Ningún asesor coincide"
                (selectionChange)="onAssigneesChange($event)"
              />
            }
          </div>

          <label class="text-sm text-muted">
            Notas
            <textarea
              formControlName="notes"
              rows="4"
              placeholder="Detalles adicionales"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            ></textarea>
          </label>

          @if (errorMessage()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
          }

          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              [disabled]="isSubmitting() || form.invalid || !canEdit()"
              class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar cambios
            </button>
            @if (deadline()!.status === DeadlineStatus.PENDING) {
              <button
                type="button"
                (click)="markDone()"
                class="rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface-muted"
              >
                Marcar como completado
              </button>
            }
            <button
              type="button"
              (click)="deleteDeadline()"
              class="rounded-md border border-danger px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger-tint"
            >
              Eliminar
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class DeadlineDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deadlinesService = inject(DeadlinesService);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly usersService = inject(UsersService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly permissionsService = inject(PermissionsService);

  readonly canEdit = computed(() => this.permissionsService.hasPermission('deadlines.update'));
  readonly canCreateTeamScope = computed(() => this.permissionsService.hasPermission('deadlines.create.team-scope'));

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly deadline = signal<DeadlineResponse | null>(null);
  readonly deadlineTypes = signal<CatalogItem[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly assignableUsers = signal<AssignableUser[]>([]);
  /** Ids de usuario de los asesores del proceso de este plazo — vacío si es
   * un evento general. Se resuelve una sola vez al cargar (ver loadDeadline). */
  readonly relatedAdvisorUserIds = signal<string[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    typeId: ['', [Validators.required]],
    dueAt: ['', [Validators.required]],
    allDay: [false],
    notes: [''],
    assigneeUserIds: [[] as string[]],
    scope: [DeadlineScope.ONLY_ME],
    blocksAgenda: [false],
    durationValue: [null as number | null],
    durationUnit: ['MINUTES' as 'MINUTES' | 'HOURS'],
    computationType: [DeadlineComputationType.BUSINESS_DAYS],
  });

  /** Vuelve a Calendario por defecto; a la pestaña Plazos del proceso de
   * origen si se llegó desde ahí (?returnTo=proceso&processId=...). Mismo
   * mecanismo de query params que ?openId= en Calendario/Tareas. */
  readonly backLink = computed<string[]>(() => {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('returnTo') === 'proceso' && params.get('processId')) {
      return ['/procesos', params.get('processId')!];
    }
    return ['/calendario'];
  });
  readonly backLabel = computed<string>(() =>
    this.route.snapshot.queryParamMap.get('returnTo') === 'proceso' ? 'Proceso' : 'Calendario',
  );
  /** Al volver a la pestaña Plazos de un proceso, reabre esa pestaña en vez
   * de la de "Datos" por defecto (ver ProcessDetailComponent.ngOnInit).
   *
   * Construido de forma imperativa (no `cond ? {tab: ...} : {}`): con un
   * ternario, TS infiere la rama vacía como `{ tab?: undefined }` para
   * unificarla con la otra rama, y esa unión ya no es asignable a
   * `Record<string, string>` (`undefined` no es `string`) — rompía el
   * build de producción aunque el código funcionara en el sandbox. */
  readonly backQueryParams = computed<Record<string, string>>(() => {
    const query: Record<string, string> = {};
    if (this.route.snapshot.queryParamMap.get('returnTo') === 'proceso') {
      query['tab'] = 'plazos';
    }
    return query;
  });

  protected readonly DeadlineStatus = DeadlineStatus;
  protected readonly DeadlineScope = DeadlineScope;
  protected readonly DeadlineComputationType = DeadlineComputationType;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;

  ngOnInit(): void {
    this.catalogsService.getActiveCatalog('deadline_type').subscribe((items) => this.deadlineTypes.set(items));
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => this.advisors.set(response.advisors),
      error: (error) => console.error('Error loading advisors:', error),
    });
    this.usersService.getAssignableUsers().subscribe({
      next: (response) => this.assignableUsers.set(response.users),
      error: (error) => console.error('Error loading assignable users:', error),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }
    this.loadDeadline(id);
  }

  private loadDeadline(id: string): void {
    this.isLoading.set(true);
    this.deadlinesService.getOne(id).subscribe({
      next: (deadline) => {
        this.deadline.set(deadline);
        this.patchForm(deadline);
        this.isLoading.set(false);
        if (deadline.processId) {
          this.legalProcessesService.getLegalProcess(deadline.processId).subscribe({
            next: (process) =>
              this.relatedAdvisorUserIds.set((process.advisors ?? []).map((advisor) => advisor.userId)),
            error: (error) => console.error('Error loading process advisors:', error),
          });
        }
      },
      error: (error) => {
        console.error('Error loading deadline:', error);
        this.isLoading.set(false);
      },
    });
  }

  private patchForm(deadline: DeadlineResponse): void {
    const usesHours = !!deadline.durationMinutes && deadline.durationMinutes % 60 === 0;
    this.form.reset({
      title: deadline.title,
      typeId: deadline.type?.id ?? '',
      dueAt: this.toLocalDateTimeInput(new Date(deadline.dueAt)),
      allDay: deadline.allDay,
      notes: deadline.notes ?? '',
      assigneeUserIds: deadline.assignees.map((assignee) => assignee.id),
      scope: deadline.scope ?? DeadlineScope.ONLY_ME,
      blocksAgenda: deadline.blocksAgenda,
      durationValue: deadline.durationMinutes ? (usesHours ? deadline.durationMinutes / 60 : deadline.durationMinutes) : null,
      durationUnit: usesHours ? 'HOURS' : 'MINUTES',
      computationType: deadline.computationType,
    });
  }

  private toLocalDateTimeInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private toDurationMinutes(value: number | null, unit: 'MINUTES' | 'HOURS'): number | undefined {
    if (!value || value <= 0) {
      return undefined;
    }
    return unit === 'HOURS' ? value * 60 : value;
  }

  /** Misma fuente que DeadlineFormModalComponent: asesores de toda la
   * empresa (priorizando los del proceso) si el plazo tiene proceso;
   * usuarios de toda la empresa si es un evento general.
   *
   * F41 (ola 4, fix 2026-09-23): convertido de método plano a computed().
   * Un método plano llamado directo en el template ("assignmentItems()")
   * devuelve un array y objetos NUEVOS en cada re-evaluación, así que
   * `<app-multi-select [items]="assignmentItems()">` recibía una
   * referencia distinta en cada ciclo de detección de cambios — incluidos
   * los que dispara cada tecla al escribir en Notas — forzando su
   * re-chequeo constantemente (a diferencia de `advisorItems` en
   * ProcessDetailComponent, que ya era un computed() real). No se pudo
   * confirmar con certeza absoluta que esto sea la causa completa del
   * bug de foco en Notas, pero es la única diferencia estructural real
   * frente a las dos instancias de ngx-editor que sí funcionan, y de por
   * sí evita trabajo y re-renders innecesarios en cada tecla. */
  protected readonly assignmentItems = computed<MultiSelectItem[]>(() => {
    if (!this.deadline()?.processId) {
      return this.assignableUsers().map((user) => ({
        id: user.id,
        label: `${user.firstName} ${user.lastName}`,
      }));
    }
    const relatedIds = new Set(this.relatedAdvisorUserIds());
    const items = this.advisors()
      .filter((advisor) => !!advisor.user)
      .map((advisor) => ({
        id: advisor.user!.id,
        label: `${advisor.user!.firstName} ${advisor.user!.lastName}`,
        ...(relatedIds.has(advisor.user!.id) ? { description: 'Asesor del proceso' } : {}),
      }));
    const related = items.filter((item) => relatedIds.has(item.id));
    const others = items.filter((item) => !relatedIds.has(item.id));
    return [...related, ...others];
  });

  /** Mismo patrón de confirmación que el modal de alta: agregar a alguien
   * no relacionado con el proceso no se bloquea, solo se confirma. */
  async onAssigneesChange(userIds: string[]): Promise<void> {
    const previousIds: string[] = this.form.get('assigneeUserIds')?.value || [];
    const addedIds = userIds.filter((id) => !previousIds.includes(id));
    const processId = this.deadline()?.processId;

    if (processId && addedIds.length > 0) {
      const relatedIds = new Set(this.relatedAdvisorUserIds());
      const unrelatedAdded = addedIds.filter((id) => !relatedIds.has(id));
      if (unrelatedAdded.length > 0) {
        const items = this.assignmentItems();
        const names = unrelatedAdded.map((id) => items.find((item) => item.id === id)?.label ?? id).join(', ');
        const confirmed = await this.confirmDialog.confirm({
          title: 'Asesor no relacionado con el proceso',
          message: `${names} no pertenece a los asesores asignados a este proceso. ¿Igual quieres asignarlo a este plazo?`,
        });
        if (!confirmed) {
          this.form.patchValue({ assigneeUserIds: previousIds });
          return;
        }
      }
    }

    this.form.patchValue({ assigneeUserIds: userIds });
  }

  submit(): void {
    const current = this.deadline();
    if (this.isSubmitting() || !current || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const formValue = this.form.getRawValue();
    const durationMinutes = formValue.allDay ? undefined : this.toDurationMinutes(formValue.durationValue, formValue.durationUnit);

    const update: UpdateDeadlineRequest = {
      title: formValue.title,
      typeId: formValue.typeId,
      dueAt: new Date(formValue.dueAt).toISOString(),
      allDay: formValue.allDay,
      notes: formValue.notes || undefined,
      assigneeUserIds: formValue.assigneeUserIds,
      durationMinutes: durationMinutes ?? null,
      computationType: formValue.computationType,
      ...(current.processId ? {} : { scope: formValue.scope, blocksAgenda: formValue.blocksAgenda }),
    };

    this.deadlinesService.update(current.id, update).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.deadline.set(updated);
        this.toast.success('Plazo actualizado correctamente.');
      },
      error: (error) => {
        console.error('Error updating deadline:', error);
        const message = error.status === 403 ? 'No tienes permiso para editar este plazo o evento.' : error.message || 'Error al actualizar el plazo';
        this.errorMessage.set(message);
        this.toast.error(message);
        this.isSubmitting.set(false);
      },
    });
  }

  markDone(): void {
    const current = this.deadline();
    if (!current) {
      return;
    }
    this.deadlinesService.update(current.id, { status: DeadlineStatus.DONE }).subscribe({
      next: (updated) => {
        this.deadline.set(updated);
        this.toast.success('Plazo marcado como completado.');
      },
      error: (error) => {
        console.error('Error updating deadline:', error);
        this.toast.error(error.message || 'Error al actualizar el plazo');
      },
    });
  }

  async deleteDeadline(): Promise<void> {
    const current = this.deadline();
    if (!current) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar plazo',
      message: `¿Estás seguro de eliminar el plazo "${current.title}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.deadlinesService.delete(current.id).subscribe({
      next: () => {
        this.toast.success('Plazo eliminado correctamente.');
        this.router.navigate(this.backLink(), { queryParams: this.backQueryParams() });
      },
      error: (error) => {
        console.error('Error deleting deadline:', error);
        this.toast.error(error.message || 'Error al eliminar el plazo');
      },
    });
  }
}
