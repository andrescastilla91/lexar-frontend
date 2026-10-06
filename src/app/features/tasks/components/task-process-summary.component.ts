import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * F42 (TAR-01): resumen del proceso al que se liga una tarea — cliente,
 * radicado y etapa — para que quien la crea confirme que eligió el correcto.
 */
@Component({
  selector: 'app-task-process-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl
      class="grid gap-x-4 gap-y-2 rounded-md border border-default bg-surface-muted p-3 text-sm sm:grid-cols-2"
      aria-label="Resumen del proceso"
    >
      <div class="min-w-0">
        <dt class="text-xs text-subtle">Cliente</dt>
        <dd class="truncate font-medium text-text">{{ clientName() || 'Sin cliente' }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-subtle">Etapa</dt>
        <dd class="truncate font-medium text-text">{{ stage() || 'Sin etapa' }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-subtle">Radicado</dt>
        <dd class="truncate font-medium text-text">{{ caseNumber() || 'Sin radicado' }}</dd>
      </div>
      <div class="min-w-0">
        <dt class="text-xs text-subtle">Código interno</dt>
        <dd class="truncate font-medium text-text">{{ internalCode() }}</dd>
      </div>
    </dl>
  `,
})
export class TaskProcessSummaryComponent {
  clientName = input<string | null>(null);
  caseNumber = input<string | null>(null);
  stage = input<string | null>(null);
  internalCode = input.required<string>();
}
