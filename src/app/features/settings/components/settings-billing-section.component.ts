import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BillingReadiness, CompanyProfile } from '../../../core/models/company.model';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SettingsBillingFormComponent } from './settings-billing-form.component';
import { SettingsCompanyDocumentsComponent } from './settings-company-documents.component';

/**
 * F45: sección «Facturación» de Configuración. Junta el estado de «¿puedo
 * contratar un plan de pago?», el formulario fiscal y los documentos de la
 * empresa, para que quien llegue desde la pantalla de planes vea de un vistazo
 * qué le falta y dónde completarlo.
 */
@Component({
  selector: 'app-settings-billing-section',
  standalone: true,
  imports: [SettingsBillingFormComponent, SettingsCompanyDocumentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      @if (readiness(); as state) {
        @if (state.ready) {
          <div class="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-text" data-test="readiness-ready">
            Tus datos de facturación están completos para contratar un plan de pago.
          </div>
        } @else {
          <div class="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text" data-test="readiness-missing">
            <p class="font-medium">Para contratar un plan de pago falta completar:</p>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              @for (item of state.missing; track item.code) {
                <li>
                  {{ item.label }}
                  @if (item.section === 'legal') {
                    <span class="text-subtle"> (en «Datos legales»)</span>
                  }
                </li>
              }
            </ul>
            @if (hasLegalItems(state)) {
              <button
                type="button"
                class="mt-3 min-h-11 rounded-md border border-default px-4 py-2 text-sm font-medium text-text transition hover:bg-surface-muted"
                (click)="sectionRequested.emit('legal')"
              >
                Ir a Datos legales
              </button>
            }
          </div>
        }
      }

      <app-settings-billing-form
        [form]="form()"
        [taxId]="company()?.taxId ?? ''"
        [isSubmitting]="isSubmitting()"
        [errorMessage]="errorMessage()"
        (submit)="submit.emit()"
      />

      <app-settings-company-documents (changed)="loadReadiness()" />
    </div>
  `,
})
export class SettingsBillingSectionComponent {
  private readonly subscriptionService = inject(SubscriptionService);

  readonly form = input.required<FormGroup>();
  readonly company = input<CompanyProfile | null>(null);
  readonly isSubmitting = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly submit = output<void>();
  readonly sectionRequested = output<string>();

  protected readonly readiness = signal<BillingReadiness | null>(null);

  constructor() {
    // Se recalcula al abrir la sección y cada vez que se guardan los datos de
    // la empresa (el contenedor reemplaza `company` con la respuesta del PATCH).
    effect(() => {
      this.company();
      untracked(() => this.loadReadiness());
    });
  }

  protected hasLegalItems(state: BillingReadiness): boolean {
    return state.missing.some((item) => item.section === 'legal');
  }

  loadReadiness(): void {
    // Quien edita la empresa pero no gestiona la suscripción recibe 403: en ese
    // caso el aviso simplemente no se muestra (el bloqueo real sigue en el servidor).
    this.subscriptionService.getBillingReadiness().subscribe({
      next: (state) => this.readiness.set(state),
      error: () => this.readiness.set(null),
    });
  }
}
