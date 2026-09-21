import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProcessStatus } from '../../../core/models/legal-process.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse, ClientMatterResponse, ClientMatterStatus } from '../../../core/models/client-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [ReactiveFormsModule, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
          class="w-full max-w-xl md:max-w-2xl grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <h3 class="text-lg font-semibold text-text">
            {{ isEditing() ? 'Editar proceso' : 'Registrar nuevo proceso' }}
          </h3>
          @if (statusMessage()) {
            <div class="rounded-md border border-warning bg-warning-tint px-4 py-3">
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-sm text-warning">{{ statusMessage() }}</p>
              </div>
            </div>
          }
          <div class="grid gap-4">
            <label class="text-sm text-muted">
              Título del proceso *
              <input
                formControlName="title"
                type="text"
                placeholder="Nombre referencial del proceso"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="text-sm text-muted">
              Descripción
              <textarea
                formControlName="description"
                placeholder="Detalles del proceso"
                rows="3"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              ></textarea>
            </label>
            <label class="text-sm text-muted">
              Cliente *
              <select
                formControlName="clientId"
                (change)="clientChange.emit($any($event.target).value)"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
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
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Sin asunto</option>
                @for (matter of matters(); track matter.id) {
                  <option [value]="matter.id">{{ matter.name }}</option>
                }
              </select>
              @if (selectedMatter()?.isDeleted) {
                <p class="mt-1 text-xs text-warning">
                  Este asunto fue eliminado. Se mantiene la referencia en el proceso.
                </p>
              } @else if (selectedMatter()?.status === ClientMatterStatus.VENCIDO) {
                <p class="mt-1 text-xs text-warning">
                  Este asunto está vencido. Puedes vincularlo igual — considera renovarlo o cerrarlo desde la ficha del cliente.
                </p>
              } @else if (isEditing() && !selectedMatterId()) {
                <p class="mt-1 text-xs text-subtle">Clasificación pendiente: este proceso no tiene un asunto asignado.</p>
              }
            </label>
            <!-- F40 §PRO-04: tipo de proceso (catálogo process_type) — opcional,
                 Decisión de transición (mismo criterio que matterId, F34 §3). -->
            <label class="text-sm text-muted">
              Tipo de proceso
              <select
                formControlName="processTypeId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Sin clasificar</option>
                @for (processType of processTypes(); track processType.id) {
                  <option [value]="processType.id">{{ processType.label }}</option>
                }
              </select>
            </label>
            <div class="text-sm text-muted">
              <!--
                BUG-06 etapa 2 (ajuste 2026-09-03): este campo se sacó del
                grid de 2 columnas y ocupa su propia fila completa. El
                multi-select crece verticalmente con los chips seleccionados
                mientras que los campos vecinos (selects simples) no, así que
                compartir columna con otro campo quedaba desbalanceado.
              -->
              <app-multi-select
                [items]="advisorItems()"
                [selectedIds]="selectedAdvisorIds()"
                label="Asesores responsables"
                placeholder="Buscar asesor…"
                emptyStateText="No hay asesores disponibles"
                (selectionChange)="advisorIdsChange.emit($event)"
              />
              <p class="mt-1 text-xs text-subtle">Selecciona uno o más asesores para el proceso</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Etapa
                <select
                  formControlName="stageId"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  @for (stage of filteredStages(); track stage.id) {
                    <option [value]="stage.id">{{ stage.label }}</option>
                  }
                </select>
                <!-- F40 §PRO-03: la etapa elegida nunca se borra sola al cambiar
                     de tipo de proceso, aunque quede fuera de alcance — solo se
                     avisa, el usuario decide si la cambia. -->
                @if (isSelectedStageOutOfScope()) {
                  <p class="mt-1 text-xs text-warning">
                    Esta etapa no está configurada para el tipo de proceso seleccionado.
                  </p>
                }
              </label>
              <label class="text-sm text-muted">
                Nivel de Riesgo
                <select
                  formControlName="riskLevelId"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  @for (riskLevel of riskLevels(); track riskLevel.id) {
                    <option [value]="riskLevel.id">{{ riskLevel.label }}</option>
                  }
                </select>
              </label>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Juzgado o entidad
                <input
                  formControlName="court"
                  type="text"
                  placeholder="Entidad o despacho"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <div class="text-sm text-muted">
                <label class="block">Número de Caso (radicado)</label>
                <input
                  formControlName="caseNumber"
                  type="text"
                  placeholder="Radicado o número de expediente"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                <p class="mt-1 text-xs text-subtle">Lo asigna el juzgado — opcional, puedes registrarlo después.</p>
                @if (isEditing() && internalCode()) {
                  <p class="mt-2 text-xs text-muted">
                    Código interno:
                    <span class="font-mono font-semibold text-text">{{ internalCode() }}</span>
                  </p>
                }
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Fecha de Inicio
                <input
                  formControlName="startDate"
                  type="date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Fecha de Fin
                <input
                  formControlName="endDate"
                  type="date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            </div>
            <p class="text-xs text-subtle">
              La próxima audiencia se calcula automáticamente a partir de los plazos de tipo "Audiencia" registrados
              en la pestaña Plazos.
            </p>
          </div>
          @if (errorMessage()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
          }
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isSubmitting() || !canEdit()"
            >
              {{ isEditing() ? 'Actualizar' : 'Guardar' }} proceso
            </button>
            <button
              type="button"
              (click)="close.emit()"
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
export class ProcessFormComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isEditing = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  statusMessage = input<string | null>(null);
  canEdit = input(true);
  clients = input<ClientResponse[]>([]);
  advisors = input<AdvisorResponse[]>([]);
  stages = input<CatalogItem[]>([]);
  riskLevels = input<CatalogItem[]>([]);
  /** F40 §PRO-04: catálogo `process_type` para el selector y para filtrar
   * `stages()` por `processTypeScope` (§PRO-03). */
  processTypes = input<CatalogItem[]>([]);
  /** F34 §3/§4: asuntos del cliente actualmente seleccionado — el contenedor
   * (processes.component.ts) los recarga cada vez que cambia `clientId`. */
  matters = input<ClientMatterResponse[]>([]);
  /** F40 §PRO-06: código interno del despacho, generado por el backend — solo lectura, null mientras el proceso aún no existe (formulario de creación). */
  internalCode = input<string | null>(null);

  close = output<void>();
  submit = output<void>();
  // BUG-06 etapa 2: reemplaza el toggle por-id (`toggleAdvisor: output<string>`)
  // por el array completo que emite MultiSelectComponent en cada cambio —
  // el contenedor (processes.component.ts) hace un patchValue directo en vez
  // de calcular el diff él mismo.
  advisorIdsChange = output<string[]>();
  // F34 §3: solo se emite en interacción real del usuario (evento nativo
  // `change` del <select>), nunca en un patchValue programático — así el
  // contenedor puede limpiar `matterId` al cambiar de cliente sin pisar el
  // valor que `editProcess()` acaba de precargar.
  clientChange = output<string>();

  protected readonly ProcessStatus = ProcessStatus;

  readonly advisorItems = computed<MultiSelectItem[]>(() =>
    this.advisors().map((advisor) => ({
      id: advisor.id,
      label: `${advisor.user?.firstName ?? ''} ${advisor.user?.lastName ?? ''}`.trim(),
      description: advisor.specialties?.[0]?.label || 'N/A',
    })),
  );

  // No es un computed a propósito: form() es un input de FormGroup mutable
  // (patchValue no cambia la referencia), así que este valor debe leerse en
  // cada ciclo de detección de cambios del template, igual que ya hacía
  // isAdvisorSelected() antes de esta migración.
  selectedAdvisorIds(): string[] {
    return this.form().get('advisorIds')?.value || [];
  }

  // No es un computed a propósito, mismo motivo que selectedAdvisorIds().
  selectedMatterId(): string {
    return this.form().get('matterId')?.value || '';
  }

  // No es un computed a propósito, mismo motivo que selectedMatterId().
  selectedProcessTypeId(): string {
    return this.form().get('processTypeId')?.value || '';
  }

  // F40 §PRO-03: las etapas visibles dependen del tipo de proceso elegido en
  // el mismo formulario — null/'' en processTypeScope = aplica a cualquier
  // tipo. La etapa ya seleccionada NUNCA se retira de la lista aunque quede
  // fuera de alcance para el tipo actual: el formulario no le borra el dato
  // al usuario, solo lo avisa (ver isSelectedStageOutOfScope()).
  filteredStages(): CatalogItem[] {
    const processTypeId = this.selectedProcessTypeId();
    const inScope = this.stages().filter(
      (stage) => !stage.processTypeScope || stage.processTypeScope === processTypeId,
    );
    const selectedStageId = this.form().get('stageId')?.value;
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
    const selectedStageId = this.form().get('stageId')?.value;
    if (!processTypeId || !selectedStageId) {
      return false;
    }
    const stage = this.stages().find((s) => s.id === selectedStageId);
    return !!stage?.processTypeScope && stage.processTypeScope !== processTypeId;
  }

  selectedMatter(): ClientMatterResponse | null {
    const matterId = this.selectedMatterId();
    if (!matterId) {
      return null;
    }
    return this.matters().find((m) => m.id === matterId) || null;
  }

  protected readonly ClientMatterStatus = ClientMatterStatus;
}
