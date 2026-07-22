import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Entitlements, PlanCatalogEntry } from '../../../core/models/subscription-backend.model';

interface UsageBar {
  label: string;
  current: number;
  max: number | null;
  percent: number;
}

@Component({
  selector: 'app-settings-plan',
  standalone: true,
  imports: [DatePipe],
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
          <h2 class="text-sm font-semibold text-text">Planes disponibles</h2>
          <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            @for (plan of plans(); track plan.code) {
              <div
                class="flex flex-col rounded-lg border p-5 shadow-card"
                [class.border-navy-900]="plan.code === ent.planCode"
                [class.border-default]="plan.code !== ent.planCode"
              >
                <p class="text-base font-semibold text-text">{{ plan.name }}</p>
                <p class="mt-1 text-2xl font-bold text-text">
                  {{ formatPrice(plan.priceMonthly, plan.currency) }}
                  <span class="text-sm font-normal text-subtle">/mes</span>
                </p>
                <ul class="mt-3 flex-1 space-y-1 text-xs text-subtle">
                  <li>{{ plan.maxUsers ?? 'Ilimitados' }} usuarios</li>
                  <li>{{ plan.maxActiveProcesses ?? 'Ilimitados' }} procesos activos</li>
                  <li>{{ plan.maxStorageMb ? plan.maxStorageMb / 1024 + ' GB' : 'Almacenamiento ilimitado' }}</li>
                  @if (plan.features.chatbot) {
                    <li>Chatbot IA</li>
                  }
                  @if (plan.features.clientPortal) {
                    <li>Portal del cliente</li>
                  }
                </ul>
                <button
                  type="button"
                  class="mt-4 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                  [class.bg-navy-900]="plan.code !== ent.planCode"
                  [class.text-white]="plan.code !== ent.planCode"
                  [class.bg-surface-muted]="plan.code === ent.planCode"
                  [class.text-subtle]="plan.code === ent.planCode"
                  [disabled]="plan.code === ent.planCode || isCheckingOut()"
                  (click)="checkout(plan.code)"
                >
                  {{ plan.code === ent.planCode ? 'Plan actual' : 'Actualizar a ' + plan.name }}
                </button>
              </div>
            }
          </div>
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

  readonly isLoading = signal(true);
  readonly isCheckingOut = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly entitlements = signal<Entitlements | null>(null);
  readonly plans = signal<PlanCatalogEntry[]>([]);

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
  }

  formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  }

  checkout(planCode: string): void {
    if (this.isCheckingOut()) {
      return;
    }
    this.isCheckingOut.set(true);

    this.subscriptionService.createCheckout({ planCode, billingCycle: 'monthly' }).subscribe({
      next: (checkout) => {
        window.location.href = checkout.url;
      },
      error: (error: Error) => {
        this.isCheckingOut.set(false);
        this.toast.error(error.message || 'No se pudo iniciar el pago.');
      },
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
