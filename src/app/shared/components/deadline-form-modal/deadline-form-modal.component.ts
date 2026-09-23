import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { AssignableUser } from '../../../core/models/user-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { DeadlineScope } from '../../../core/models/deadline.model';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { MultiSelectComponent, MultiSelectItem } from '../multi-select/multi-select.component';

/**
 * F41 (ola 4, rediseño 2026-09-23): modal de ALTA único para plazos/eventos,
 * compartido entre CalendarComponent (contexto general, con selector de
 * Proceso) y la pestaña "Plazos" de ProcessDetailComponent (proceso fijo,
 * sin selector) — reemplaza el modal embebido que tenía CalendarComponent y
 * el formulario de ProcessDeadlinesModalComponent: mismo diseño en los dos
 * sitios, nunca dos formularios distintos para lo mismo.
 *
 * Deliberadamente NO incluye Notas, Cómputo del término ni Duración — esos
 * campos viven solo en la vista de edición (/calendario/plazos/:id), fuera
 * de cualquier contexto con FullCalendar. Al crear, el contenedor navega
 * directo a esa ficha para completarlos (mismo patrón que
 * UserFormComponent/ProcessFormComponent → ficha de detalle).
 *
 * La sección "Asignación" es un único fieldset en una posición fija: cambia
 * su contenido según haya o no proceso, pero el fieldset nunca aparece,
 * desaparece ni cambia de lugar — a diferencia del formulario anterior.
 */
@Component({
  selector: 'app-deadline-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <form
          class="w-full max-w-lg md:max-w-2xl overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
          style="max-height: 90vh"
          [formGroup]="form()"
          (ngSubmit)="formSubmit.emit()"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text">
              {{ !showProcessField() ? 'Nuevo plazo' : (selectedProcessId() ? 'Nuevo plazo o audiencia' : 'Nuevo evento general') }}
            </h3>
            <button
              type="button"
              (click)="formCancel.emit()"
              class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="grid gap-6">
            @if (showProcessField()) {
              <label class="text-sm text-muted">
                Proceso
                <select
                  formControlName="processId"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  <option value="">Sin proceso (evento general)</option>
                  @for (process of processes(); track process.id) {
                    <option [value]="process.id">{{ process.title }}</option>
                  }
                </select>
              </label>
            }

            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <label class="text-sm text-muted">
                Fecha y hora *
                <input
                  formControlName="dueAt"
                  type="datetime-local"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            </div>

            <label class="flex items-center gap-2 text-sm text-muted">
              <input
                formControlName="allDay"
                type="checkbox"
                class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
              />
              Todo el día
            </label>

            <!-- Asignación: fieldset único y fijo — nunca cambia de lugar,
                 solo su contenido según haya o no proceso seleccionado. -->
            <div class="grid gap-4 rounded-lg border border-default bg-surface-muted p-4">
              <h4 class="text-sm font-semibold text-text">Asignación</h4>

              @if (showProcessField() && !selectedProcessId()) {
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

                @if (form().get('scope')?.value === DeadlineScope.TEAM) {
                  <p class="text-sm text-subtle">
                    Este evento alcanza a todo el equipo — no aplica seleccionar asistentes puntuales.
                  </p>
                } @else if (form().get('scope')?.value === DeadlineScope.SELECTED) {
                  <app-multi-select
                    [items]="assignmentItems()"
                    [selectedIds]="form().get('assigneeUserIds')?.value || []"
                    label="Asignar a"
                    placeholder="Buscar usuario…"
                    emptyStateText="Ningún usuario coincide"
                    (selectionChange)="assigneesChange.emit($event)"
                  />
                } @else {
                  <p class="text-sm text-subtle">Este evento queda asignado solo a ti.</p>
                }
              } @else if (assignmentItems().length > 0) {
                <app-multi-select
                  [items]="assignmentItems()"
                  [selectedIds]="form().get('assigneeUserIds')?.value || []"
                  label="Asignar a"
                  placeholder="Buscar asesor…"
                  emptyStateText="Ningún asesor coincide"
                  (selectionChange)="assigneesChange.emit($event)"
                />
              }
            </div>

            @if (errorMessage()) {
              <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
            }
          </div>

          <div class="mt-6 flex gap-3">
            <button
              type="button"
              (click)="formCancel.emit()"
              class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isSubmitting() || form().invalid"
            >
              {{ showProcessField() && !selectedProcessId() ? 'Crear evento' : 'Crear plazo' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class DeadlineFormModalComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  /** true en Calendario (contexto general, puede o no haber proceso); false
   * en la pestaña Plazos de un Proceso, donde el proceso ya es fijo y este
   * campo nunca se muestra — es una decisión por instancia del modal, no un
   * estado que cambie mientras el modal está abierto (eso es justo lo que
   * generaba el "aparece/desaparece" del formulario anterior). */
  showProcessField = input(false);
  processes = input<LegalProcessResponse[]>([]);
  deadlineTypes = input<CatalogItem[]>([]);
  canCreateTeamScope = input(false);

  /** Usuarios de toda la empresa — fuente de "asignar a" cuando no hay
   * proceso (alcance "Para asesores seleccionados" de un evento general). */
  assignableUsers = input<AssignableUser[]>([]);
  /** Todos los asesores de la empresa — fuente de "asignar a" cuando SÍ hay
   * proceso (de Calendario o de la pestaña Plazos). */
  advisors = input<AdvisorResponse[]>([]);
  /** Ids de usuario de los asesores relacionados con el proceso relevante
   * en cada momento — el padre la recalcula según el proceso fijo (Plazos
   * de Proceso) o el elegido en el selector (Calendario), para priorizarlos
   * en el multi-select ("Asesor del proceso") sin ocultar el resto. */
  relatedAdvisorUserIds = input<string[]>([]);

  formCancel = output<void>();
  formSubmit = output<void>();
  assigneesChange = output<string[]>();

  protected readonly DeadlineScope = DeadlineScope;

  /** No es un computed(): depende de form().get(...)?.value, que no es una
   * signal — se reevalúa junto al resto de la plantilla en cada ciclo de
   * detección de cambios (mismo patrón usado en el resto de la app). */
  protected selectedProcessId(): string {
    return this.showProcessField() ? this.form().get('processId')?.value || '' : '';
  }

  /** Fuente de "asignar a" cuando hay proceso (fijo o elegido en el
   * selector): asesores de toda la empresa, con los relacionados al
   * proceso primero. Sin proceso (evento general de Calendario): usuarios
   * de toda la empresa, no solo asesores. */
  protected assignmentItems(): MultiSelectItem[] {
    if (this.showProcessField() && !this.selectedProcessId()) {
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
  }
}
