import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PortalVisibilityPolicyService } from '../../../core/services/portal-visibility-policy.service';
import {
  PortalEventVisibilityMode,
  PortalEventVisibilityPolicy,
} from '../../../core/models/portal-visibility-policy.model';
import { ProcessEventType } from '../../../core/models/process-event.model';
import { getEventLabel } from '../../processes/utils/process-format.utils';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

const MODE_LABELS: Record<PortalEventVisibilityMode, string> = {
  [PortalEventVisibilityMode.ALWAYS]: 'Siempre visible',
  [PortalEventVisibilityMode.DEFAULT_ON]: 'Visible por defecto',
  [PortalEventVisibilityMode.DEFAULT_OFF]: 'Oculto por defecto',
};

@Component({
  selector: 'app-settings-portal-visibility',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <p class="text-sm text-subtle">
        Define qué eventos del proceso se comparten con el cliente en el portal. "Siempre visible"
        nace visible y no se puede ocultar caso a caso; "Visible por defecto" nace visible pero el
        asesor puede ocultarlo; "Oculto por defecto" nace oculto y el asesor decide mostrarlo.
      </p>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando política de visibilidad…</p>
      } @else {
        <div class="space-y-2">
          @for (policy of policies(); track policy.eventType) {
            <div class="flex items-center justify-between gap-3 rounded-lg border border-default bg-surface p-4 shadow-card">
              <span class="text-sm font-medium text-text">{{ getEventLabel(policy.eventType) }}</span>
              <select
                *hasPermission="'companies.edit'"
                class="rounded-md border border-default bg-surface px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                [disabled]="savingEventType() === policy.eventType"
                (change)="onModeChange(policy, $event)"
              >
                @if (policy.allowsAlways) {
                  <option [value]="modes.ALWAYS" [selected]="policy.mode === modes.ALWAYS">{{ modeLabels[modes.ALWAYS] }}</option>
                }
                <option [value]="modes.DEFAULT_ON" [selected]="policy.mode === modes.DEFAULT_ON">{{ modeLabels[modes.DEFAULT_ON] }}</option>
                <option [value]="modes.DEFAULT_OFF" [selected]="policy.mode === modes.DEFAULT_OFF">{{ modeLabels[modes.DEFAULT_OFF] }}</option>
              </select>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SettingsPortalVisibilityComponent implements OnInit {
  private readonly policyService = inject(PortalVisibilityPolicyService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly policies = signal<PortalEventVisibilityPolicy[]>([]);
  readonly isLoading = signal(false);
  readonly savingEventType = signal<ProcessEventType | null>(null);

  protected readonly modes = PortalEventVisibilityMode;
  protected readonly modeLabels = MODE_LABELS;
  protected readonly getEventLabel = getEventLabel;

  ngOnInit(): void {
    this.loadPolicies();
  }

  private loadPolicies(): void {
    this.isLoading.set(true);
    this.policyService.getAll().subscribe({
      next: (policies) => {
        this.policies.set(policies);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cargar la política de visibilidad');
        this.isLoading.set(false);
      },
    });
  }

  async onModeChange(policy: PortalEventVisibilityPolicy, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newMode = select.value as PortalEventVisibilityMode;
    if (newMode === policy.mode) {
      return;
    }

    // F27: ANNOTATION en DEFAULT_ON cambia el comportamiento por defecto de
    // toda anotación nueva (nace visible para el cliente) — se pide
    // confirmación porque es fácil de activar sin querer desde un select.
    if (policy.eventType === ProcessEventType.ANNOTATION && newMode === PortalEventVisibilityMode.DEFAULT_ON) {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Anotaciones visibles por defecto',
        message:
          'Con esta opción, toda anotación nueva será visible para el cliente en el portal a menos que el asesor la marque como interna al crearla. ¿Deseas continuar?',
      });
      if (!confirmed) {
        select.value = policy.mode;
        return;
      }
    }

    this.savingEventType.set(policy.eventType);
    this.policyService.update(policy.eventType, newMode).subscribe({
      next: (updated) => {
        this.policies.update((current) =>
          current.map((p) => (p.eventType === updated.eventType ? updated : p))
        );
        this.savingEventType.set(null);
        this.toast.success('Política de visibilidad actualizada correctamente.');
      },
      error: (error) => {
        select.value = policy.mode;
        this.savingEventType.set(null);
        this.toast.error(error.message || 'No se pudo actualizar la política de visibilidad.');
      },
    });
  }
}
