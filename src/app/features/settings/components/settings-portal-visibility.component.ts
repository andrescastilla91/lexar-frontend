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
import { SelectComponent, SelectItem } from '../../../shared/components/select/select.component';

const MODE_LABELS: Record<PortalEventVisibilityMode, string> = {
  [PortalEventVisibilityMode.ALWAYS]: 'Siempre visible',
  [PortalEventVisibilityMode.DEFAULT_ON]: 'Visible por defecto',
  [PortalEventVisibilityMode.DEFAULT_OFF]: 'Oculto por defecto',
};

@Component({
  selector: 'app-settings-portal-visibility',
  standalone: true,
  imports: [HasPermissionDirective, SelectComponent],
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
            <div class="flex flex-col gap-2 rounded-lg border border-default bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span class="text-sm font-medium text-text">{{ getEventLabel(policy.eventType) }}</span>
              <app-select
                *hasPermission="'companies.edit'"
                class="w-full sm:w-56"
                [items]="modeItems(policy)"
                [value]="policy.mode"
                [isDisabled]="savingEventType() === policy.eventType"
                [ariaLabel]="'Visibilidad de ' + getEventLabel(policy.eventType)"
                data-test="portal-visibility-mode"
                (valueChange)="onModeChange(policy, $event)"
              />
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

  protected modeItems(policy: PortalEventVisibilityPolicy): SelectItem[] {
    const modes = policy.allowsAlways
      ? [PortalEventVisibilityMode.ALWAYS, PortalEventVisibilityMode.DEFAULT_ON, PortalEventVisibilityMode.DEFAULT_OFF]
      : [PortalEventVisibilityMode.DEFAULT_ON, PortalEventVisibilityMode.DEFAULT_OFF];
    return modes.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));
  }

  // El selector es controlado (`[value]="policy.mode"`): si se cancela la
  // confirmación o falla el guardado, el valor de la política no cambia y el
  // selector sigue mostrando el modo real.
  async onModeChange(policy: PortalEventVisibilityPolicy, value: string | null): Promise<void> {
    const newMode = value as PortalEventVisibilityMode;
    if (!newMode || newMode === policy.mode) {
      return;
    }

    // F27: ANNOTATION en DEFAULT_ON cambia el comportamiento por defecto de
    // toda anotación nueva (nace visible para el cliente) — se pide
    // confirmación porque es fácil de activar sin querer desde un selector.
    if (policy.eventType === ProcessEventType.ANNOTATION && newMode === PortalEventVisibilityMode.DEFAULT_ON) {
      const confirmed = await this.confirmDialog.confirm({
        title: 'Anotaciones visibles por defecto',
        message:
          'Con esta opción, toda anotación nueva será visible para el cliente en el portal a menos que el asesor la marque como interna al crearla. ¿Deseas continuar?',
      });
      if (!confirmed) {
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
        this.savingEventType.set(null);
        this.toast.error(error.message || 'No se pudo actualizar la política de visibilidad.');
      },
    });
  }
}
