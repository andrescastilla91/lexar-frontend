import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse } from '../../../core/models/client-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';

/**
 * F40 Ola 4a: recortado a los campos esenciales para ABRIR el expediente
 * (ver "Campos esenciales para la creación" en F40-ajustes-procesos-piloto.md,
 * sección "Ola 4 (revisada)"). Ya no se usa para editar — la edición vive en
 * la pestaña "Datos" de ProcessDetailComponent, con su propio formulario
 * independiente (mismo criterio que ClientFormComponent/ClientDetailComponent
 * en F33/F34). Asunto, descripción, juzgado, radicado y fechas se completan
 * después desde el detalle.
 */
@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [ReactiveFormsModule, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
          class="w-full max-w-xl grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          [formGroup]="form()"
          (ngSubmit)="submit.emit()"
        >
          <div>
            <h3 class="text-lg font-semibold text-text">Registrar nuevo proceso</h3>
            <p class="mt-1 text-xs text-subtle">
              Completa los datos esenciales para abrir el expediente. Asunto, descripción, juzgado, radicado y
              fechas se agregan después desde la ficha del proceso.
            </p>
          </div>
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
              Cliente *
              <select
                formControlName="clientId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Seleccionar cliente</option>
                @for (client of clients(); track client.id) {
                  <option [value]="client.id">{{ client.fullName }}</option>
                }
              </select>
            </label>
            <!-- F40 §PRO-04: se promueve a esencial — condiciona qué etapas aplican (§PRO-03). -->
            <label class="text-sm text-muted">
              Tipo de proceso *
              <select
                formControlName="processTypeId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Seleccionar tipo</option>
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
              <!-- F40 Ola 4a: se promueve a recomendado en creación — un
                   proceso sin asesor asignado queda fuera del alcance de
                   visibilidad de quien no tenga legal_processes.view.all
                   (F36) hasta que alguien se lo asigne. -->
              <p class="mt-1 text-xs text-subtle">
                Selecciona uno o más asesores — evita que el proceso quede sin responsable visible para su equipo.
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Etapa *
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
                Nivel de Riesgo *
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
          </div>
          @if (errorMessage()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
          }
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="isSubmitting()"
            >
              Guardar proceso
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
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  clients = input<ClientResponse[]>([]);
  advisors = input<AdvisorResponse[]>([]);
  stages = input<CatalogItem[]>([]);
  riskLevels = input<CatalogItem[]>([]);
  processTypes = input<CatalogItem[]>([]);

  close = output<void>();
  submit = output<void>();
  // BUG-06 etapa 2: reemplaza el toggle por-id (`toggleAdvisor: output<string>`)
  // por el array completo que emite MultiSelectComponent en cada cambio —
  // el contenedor (processes.component.ts) hace un patchValue directo en vez
  // de calcular el diff él mismo.
  advisorIdsChange = output<string[]>();

  readonly advisorItems = computed<MultiSelectItem[]>(() =>
    this.advisors().map((advisor) => ({
      id: advisor.id,
      label: `${advisor.user?.firstName ?? ''} ${advisor.user?.lastName ?? ''}`.trim(),
      description: advisor.specialties?.[0]?.label || 'N/A',
    })),
  );

  // No es un computed a propósito: form() es un input de FormGroup mutable
  // (patchValue no cambia la referencia), así que este valor debe leerse en
  // cada ciclo de detección de cambios del template.
  selectedAdvisorIds(): string[] {
    return this.form().get('advisorIds')?.value || [];
  }

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
}
