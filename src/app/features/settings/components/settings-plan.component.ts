import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Entitlements, PlanCatalogEntry, SaasInvoice } from '../../../core/models/subscription-backend.model';
import { PlanComparisonTableComponent } from './plan-comparison-table.component';

interface UsageBar {
  label: string;
  current: number;
  max: number | null;
  percent: number;
}

@Component({
  selector: 'app-settings-plan',
  standalone: true,
  imports: [DatePipe, PlanComparisonTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando información del plan…</p>
      } @else if (entitlements(); as ent) {
        @if (ent.status === 'trialing') {
          <div class="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-text">
            Estás en período de prueba.
            @if (trialDaysLeft(); as days) {
              Te quedan <strong>{{ days }}</strong> {{ days === 1 ? 'día' : 'días' }}.
            }
            Elige un plan abajo para no perder acceso al terminar.
          </div>
        }

        @if (ent.status === 'past_due') {
          <div class="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text">
            Tu último pago no se pudo procesar. Tienes acceso completo por unos días más de gracia
            — actualiza tu método de pago para evitar la suspensión.
          </div>
        }

        @if (ent.isReadOnly) {
          <div class="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">
            Tu suscripción está suspendida: solo puedes consultar información, no crear ni editar.
            Contrata un plan para reactivar tu cuenta.
          </div>
        }

        <div class="rounded-lg border border-default bg-surface p-5 shadow-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-wide text-subtle">Plan actual</p>
              <p class="text-xl font-semibold text-text">{{ ent.planName }}</p>
            </div>
            @if (ent.cancelAtPeriodEnd) {
              <span class="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
                Se cancela el {{ ent.currentPeriodEnd | date: 'd MMM y' }}
              </span>
            } @else if (ent.status === 'active') {
              <span class="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">Activo</span>
            }
          </div>

          <div class="mt-5 flex flex-col gap-4">
            @for (bar of usageBars(); track bar.label) {
              <div>
                <div class="flex items-center justify-between text-xs text-subtle">
                  <span>{{ bar.label }}</span>
                  <span>{{ bar.current }}{{ bar.max !== null ? ' / ' + bar.max : ' (ilimitado)' }}</span>
                </div>
                <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    class="h-full rounded-full transition-all"
                    [class.bg-danger]="bar.percent >= 90"
                    [class.bg-warning]="bar.percent >= 70 && bar.percent < 90"
                    [class.bg-navy-900]="bar.percent < 70"
                    [style.width.%]="bar.percent"
                  ></div>
                </div>
              </div>
            }
          </div>

          @if (!ent.cancelAtPeriodEnd && ent.status !== 'trialing') {
            <div class="mt-5 border-t border-default pt-4">
              <button
                type="button"
                class="text-sm font-medium text-danger hover:underline"
                (click)="cancel()"
              >
                Cancelar suscripción al final del período
              </button>
            </div>
          }
        </div>

        <div>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-text">Planes disponibles</h2>
            @if (simulationEnabled()) {
              <span class="rounded-full bg-info/15 px-3 py-1 text-xs font-medium text-info">
                Modo simulación de pagos
              </span>
            }
          </div>
          <div class="mt-3">
            <app-plan-comparison-table
              [plans]="plans()"
              [currentPlanCode]="ent.planCode"
              [suggestedPlanCode]="suggestedPlanCode()"
              [isCheckingOut]="isCheckingOut()"
              (selectPlan)="checkout($event)"
            />
          </div>
        </div>

        <div>
          <h2 class="text-sm font-semibold text-text">Historial de facturas</h2>
          @if (invoices().length === 0) {
            <p class="mt-2 text-sm text-subtle">Aún no tienes facturas.</p>
          } @else {
            <div class="mt-3 overflow-x-auto rounded-lg border border-default">
              <table class="w-full text-left text-sm">
                <thead class="bg-surface-muted text-xs uppercase text-subtle">
                  <tr>
                    <th class="px-4 py-2">Número</th>
                    <th class="px-4 py-2">Período</th>
                    <th class="px-4 py-2">Monto</th>
                    <th class="px-4 py-2">Estado</th>
                    <th class="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (invoice of invoices(); track invoice.id) {
                    <tr class="border-t border-default">
                      <td class="px-4 py-2 text-text">{{ invoice.number }}</td>
                      <td class="px-4 py-2 text-subtle">
                        {{ invoice.periodStart | date: 'd MMM y' }} — {{ invoice.periodEnd | date: 'd MMM y' }}
                      </td>
                      <td class="px-4 py-2 text-text">{{ formatPrice(invoice.amount, invoice.currency) }}</td>
                      <td class="px-4 py-2">
                        <span [class]="invoiceStatusClasses(invoice.status)">
                          {{ invoice.status }}
                        </span>
                      </td>
                      <td class="px-4 py-2 text-right">
                        @if (invoice.pdfKey) {
                          <button
                            type="button"
                            class="text-sm font-medium text-navy-900 hover:underline"
                            (click)="downloadInvoice(invoice.id)"
                          >
                            Descargar PDF
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      } @else if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      }
    </div>
  `,
})
export class SettingsPlanComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  /** F7-R3: plan a resaltar cuando se llega vía el CTA de upgrade de otra pantalla. */
  readonly suggestedPlanCode = input<string | null>(null);

  readonly isLoading = signal(true);
  readonly isCheckingOut = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly entitlements = signal<Entitlements | null>(null);
  readonly plans = signal<PlanCatalogEntry[]>([]);
  readonly invoices = signal<SaasInvoice[]>([]);
  readonly simulationEnabled = signal(false);

  readonly trialDaysLeft = computed(() => {
    const ent = this.entitlements();
    if (!ent?.trialEndsAt) {
      return null;
    }
    const msLeft = new Date(ent.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  });

  readonly usageBars = computed<UsageBar[]>(() => {
    const ent = this.entitlements();
    if (!ent) {
      return [];
    }
    const toPercent = (current: number, max: number | null): number =>
      max === null || max === 0 ? Math.min(100, current > 0 ? 15 : 0) : Math.min(100, Math.round((current / max) * 100));

    return [
      { label: 'Usuarios', current: ent.usage.users, max: ent.limits.maxUsers, percent: toPercent(ent.usage.users, ent.limits.maxUsers) },
      {
        label: 'Procesos activos',
        current: ent.usage.activeProcesses,
        max: ent.limits.maxActiveProcesses,
        percent: toPercent(ent.usage.activeProcesses, ent.limits.maxActiveProcesses),
      },
      {
        label: 'Almacenamiento (MB)',
        current: ent.usage.storageMb,
        max: ent.limits.maxStorageMb,
        percent: toPercent(ent.usage.storageMb, ent.limits.maxStorageMb),
      },
    ];
  });

  ngOnInit(): void {
    this.subscriptionService.getEntitlements().subscribe({
      next: (entitlements) => {
        this.entitlements.set(entitlements);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo cargar la información de tu plan.');
        this.isLoading.set(false);
      },
    });

    this.subscriptionService.getPlanCatalog().subscribe({
      next: (plans) => this.plans.set(plans.filter((plan) => plan.code !== 'TRIAL')),
      error: () => {},
    });

    this.subscriptionService.listInvoices().subscribe({
      next: (invoices) => this.invoices.set(invoices),
      error: () => {},
    });

    this.subscriptionService.isSimulationEnabled().subscribe({
      next: (enabled) => this.simulationEnabled.set(enabled),
      error: () => {},
    });
  }

  formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  }

  invoiceStatusClasses(status: SaasInvoice['status']): string {
    const base = 'rounded-full px-2 py-1 text-xs font-medium';
    if (status === 'paid') {
      return `${base} bg-success/15 text-success`;
    }
    if (status === 'failed') {
      return `${base} bg-danger/15 text-danger`;
    }
    return `${base} bg-surface-muted text-subtle`;
  }

  downloadInvoice(id: string): void {
    this.subscriptionService.downloadInvoice(id).subscribe({
      next: (url) => window.open(url, '_blank'),
      error: (error: Error) => this.toast.error(error.message || 'No se pudo descargar la factura.'),
    });
  }

  async checkout(planCode: string): Promise<void> {
    if (this.isCheckingOut()) {
      return;
    }

    const planName = this.plans().find((p) => p.code === planCode)?.name ?? planCode;
    const confirmed = await this.confirmDialog.confirm(
      this.simulationEnabled()
        ? {
            title: 'Simular contratación de plan',
            message: `Vas a simular la contratación del plan ${planName}: se activará de inmediato y se generará una factura de prueba, sin ningún cobro real.`,
          }
        : {
            title: 'Ir a la pasarela de pago',
            message: `Vas a ser redirigido a Wompi para pagar el plan ${planName}. Al terminar, volverás automáticamente a esta página.`,
          }
    );
    if (!confirmed) {
      return;
    }

    this.isCheckingOut.set(true);

    if (this.simulationEnabled()) {
      this.subscriptionService.simulateSubscription(planCode).subscribe({
        next: () => {
          this.isCheckingOut.set(false);
          this.toast.success('Suscripción y factura simuladas correctamente.');
          this.reloadAfterCheckout();
        },
        error: (error: Error) => {
          this.isCheckingOut.set(false);
          this.toast.error(error.message || 'No se pudo simular la suscripción.');
        },
      });
      return;
    }

    this.subscriptionService.createCheckout({ planCode, billingCycle: 'monthly' }).subscribe({
      next: (checkout) => {
        this.toast.success('Redirigiendo a la pasarela de pago…');
        setTimeout(() => {
          window.location.href = checkout.url;
        }, 1500);
      },
      error: (error: Error) => {
        this.isCheckingOut.set(false);
        this.toast.error(error.message || 'No se pudo iniciar el pago.');
      },
    });
  }

  private reloadAfterCheckout(): void {
    this.subscriptionService.getEntitlements().subscribe({
      next: (entitlements) => this.entitlements.set(entitlements),
    });
    this.subscriptionService.listInvoices().subscribe({
      next: (invoices) => this.invoices.set(invoices),
    });
  }

  async cancel(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancelar suscripción',
      message: 'Tu plan seguirá activo hasta el final del período actual. ¿Deseas continuar?',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.subscriptionService.cancelAtPeriodEnd().subscribe({
      next: (result) => {
        this.toast.success(result.message);
        this.entitlements.update((ent) => (ent ? { ...ent, cancelAtPeriodEnd: true } : ent));
      },
      error: (error: Error) => this.toast.error(error.message || 'No se pudo cancelar la suscripción.'),
    });
  }
}
