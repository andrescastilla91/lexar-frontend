import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProcessStage, ProcessStatus, RiskLevel } from '../../../core/models/legal-process.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse } from '../../../core/models/client-backend.model';

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [ReactiveFormsModule],
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
            <div class="grid gap-4 md:grid-cols-2">
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
              <div class="text-sm text-muted">
                <label class="mb-2 block">Asesores responsables</label>
                <div class="mt-2 max-h-40 overflow-y-auto rounded-md border border-default bg-surface-muted p-3 shadow-card">
                  @if (advisors().length === 0) {
                    <p class="text-center text-xs text-subtle">No hay asesores disponibles</p>
                  } @else {
                    <div class="space-y-2">
                      @for (advisor of advisors(); track advisor.id) {
                        <label class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-surface">
                          <input
                            type="checkbox"
                            [checked]="isAdvisorSelected(advisor.id)"
                            (change)="toggleAdvisor.emit(advisor.id)"
                            class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                          />
                          <div class="flex-1">
                            <p class="text-xs font-medium text-text">
                              {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                            </p>
                            <p class="text-xs text-subtle">{{ advisor.specialty }}</p>
                          </div>
                        </label>
                      }
                    </div>
                  }
                </div>
                <p class="mt-1 text-xs text-subtle">Selecciona uno o más asesores para el proceso</p>
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Etapa
                <select
                  formControlName="stage"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  <option [value]="ProcessStage.INVESTIGATION">Investigación</option>
                  <option [value]="ProcessStage.HEARING">Audiencia</option>
                  <option [value]="ProcessStage.NOTIFICATION">Notificación</option>
                  <option [value]="ProcessStage.EXECUTION">Ejecución</option>
                </select>
              </label>
              <label class="text-sm text-muted">
                Nivel de Riesgo
                <select
                  formControlName="riskLevel"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  <option [value]="RiskLevel.LOW">Bajo</option>
                  <option [value]="RiskLevel.MEDIUM">Medio</option>
                  <option [value]="RiskLevel.HIGH">Alto</option>
                </select>
              </label>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Corte / Jurisdicción
                <input
                  formControlName="court"
                  type="text"
                  placeholder="Entidad o despacho"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <div class="text-sm text-muted">
                <label class="block">Número de Caso</label>
                <div class="mt-2 flex gap-2">
                  <input
                    formControlName="caseNumber"
                    type="text"
                    placeholder="Radicado o número de expediente"
                    class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                  <button
                    type="button"
                    (click)="generateCaseNumber.emit()"
                    class="rounded-md bg-surface-muted px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface-sunken"
                    title="Generar número automático"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
                <p class="mt-1 text-xs text-subtle">Puedes generar un número automático o ingresarlo manualmente</p>
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              <label class="text-sm text-muted">
                Fecha de Inicio
                <input
                  formControlName="startDate"
                  type="date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Próxima Audiencia
                <input
                  formControlName="nextHearingDate"
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

  close = output<void>();
  submit = output<void>();
  toggleAdvisor = output<string>();
  generateCaseNumber = output<void>();

  protected readonly ProcessStage = ProcessStage;
  protected readonly RiskLevel = RiskLevel;
  protected readonly ProcessStatus = ProcessStatus;

  isAdvisorSelected(advisorId: string): boolean {
    const selectedIds = this.form().get('advisorIds')?.value || [];
    return selectedIds.includes(advisorId);
  }
}
