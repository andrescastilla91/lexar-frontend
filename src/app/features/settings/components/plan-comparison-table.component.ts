import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PlanCatalogEntry, PlanFeatures } from '../../../core/models/subscription-backend.model';

interface FeatureRow {
  key: keyof PlanFeatures;
  label: string;
}

interface LimitRow {
  label: string;
  value: (plan: PlanCatalogEntry) => string;
}

// F7-anexo §"Los tres planes": el orden en que se venden las capacidades —
// no es el orden en que se agregaron los flags al backend (F7-R1).
const FEATURE_ROWS: FeatureRow[] = [
  { key: 'clientPortal', label: 'Portal del cliente' },
  { key: 'taskApprovals', label: 'Motor de aprobaciones de tareas' },
  { key: 'customCatalogs', label: 'Catálogos personalizables' },
  { key: 'chatbot', label: 'Asistente de IA' },
  { key: 'mandatory2faPolicy', label: 'Política de 2FA obligatoria para el equipo' },
  { key: 'advancedReports', label: 'Reportes avanzados' },
  { key: 'exportableReports', label: 'Exportar reportes' },
  { key: 'exportableAudit', label: 'Auditoría exportable' },
  { key: 'earlyAccess', label: 'Acceso anticipado a funciones nuevas' },
];

const LIMIT_ROWS: LimitRow[] = [
  { label: 'Usuarios', value: (plan) => (plan.maxUsers === null ? 'Ilimitados' : `${plan.maxUsers}`) },
  {
    label: 'Procesos activos',
    value: (plan) => (plan.maxActiveProcesses === null ? 'Ilimitados' : `${plan.maxActiveProcesses}`),
  },
  {
    label: 'Almacenamiento',
    value: (plan) => (plan.maxStorageMb === null ? 'Ilimitado' : `${plan.maxStorageMb / 1024} GB`),
  },
  { label: 'Cupo de IA (respuestas/mes)', value: (plan) => `${plan.aiCreditsMonth}` },
  {
    label: 'Clientes en el portal',
    value: (plan) => (plan.portalClientsMax === null ? 'Ilimitados' : `${plan.portalClientsMax}`),
  },
];

// Decisión del propietario (anexo F7, 2026-08-19): Estudio es el plan
// ancla. Es una decisión de negocio fija, no un flag del catálogo — igual
// que el nombre o el precio, no cambia según entitlements del tenant.
const RECOMMENDED_PLAN_CODE = 'ESTUDIO';

/**
 * F7-R3: tabla comparativa de planes, presentacional pura — no llama a
 * ningún servicio. Recibe el catálogo ya cargado por el contenedor
 * (`SettingsPlanComponent`) y renderiza los 9 flags de `PlanFeatures` y los
 * 5 límites reales, sin nada hardcodeado salvo el plan recomendado (decisión
 * de negocio, no un dato del catálogo).
 */
@Component({
  selector: 'app-plan-comparison-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      @for (plan of plans(); track plan.code) {
        <div
          class="relative flex flex-col rounded-lg border p-5 shadow-card"
          [class.border-navy-900]="plan.code === currentPlanCode() && plan.code !== suggestedPlanCode()"
          [class.border-info]="plan.code === suggestedPlanCode()"
          [class.ring-2]="plan.code === suggestedPlanCode()"
          [class.ring-info]="plan.code === suggestedPlanCode()"
          [class.border-default]="plan.code !== currentPlanCode() && plan.code !== suggestedPlanCode()"
        >
          <div class="flex flex-wrap items-center gap-2">
            @if (plan.code === recommendedPlanCode) {
              <span class="rounded-full bg-navy-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Recomendado
              </span>
            }
            @if (plan.code === suggestedPlanCode()) {
              <span class="rounded-full bg-info/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-info">
                Plan sugerido para ti
              </span>
            }
          </div>

          <p class="mt-2 text-base font-semibold text-text">{{ plan.name }}</p>
          <p class="mt-1 text-2xl font-bold text-text">
            {{ formatPrice(plan.priceMonthly, plan.currency) }}
            <span class="text-sm font-normal text-subtle">/mes</span>
          </p>

          <ul class="mt-4 flex-1 space-y-1.5 text-xs">
            @for (row of featureRows; track row.key) {
              <li class="flex items-center gap-2" [class.text-subtle]="!plan.features[row.key]" [class.text-text]="plan.features[row.key]">
                @if (plan.features[row.key]) {
                  <svg class="h-3.5 w-3.5 flex-shrink-0 text-success" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                } @else {
                  <svg class="h-3.5 w-3.5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                }
                {{ row.label }}
              </li>
            }
          </ul>

          <details class="mt-4 border-t border-default pt-3 text-xs text-subtle">
            <summary class="cursor-pointer select-none font-medium text-muted">Límites de uso</summary>
            <ul class="mt-2 space-y-1">
              @for (row of limitRows; track row.label) {
                <li class="flex items-center justify-between">
                  <span>{{ row.label }}</span>
                  <span class="font-medium text-text">{{ row.value(plan) }}</span>
                </li>
              }
            </ul>
          </details>

          <button
            type="button"
            class="mt-4 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
            [class.bg-navy-900]="plan.code !== currentPlanCode()"
            [class.text-white]="plan.code !== currentPlanCode()"
            [class.bg-surface-muted]="plan.code === currentPlanCode()"
            [class.text-subtle]="plan.code === currentPlanCode()"
            [disabled]="plan.code === currentPlanCode() || isCheckingOut()"
            (click)="selectPlan.emit(plan.code)"
          >
            {{ plan.code === currentPlanCode() ? 'Plan actual' : 'Actualizar a ' + plan.name }}
          </button>
        </div>
      }
    </div>
  `,
})
export class PlanComparisonTableComponent {
  readonly plans = input.required<PlanCatalogEntry[]>();
  readonly currentPlanCode = input.required<string>();
  readonly suggestedPlanCode = input<string | null>(null);
  readonly isCheckingOut = input(false);

  readonly selectPlan = output<string>();

  protected readonly featureRows = FEATURE_ROWS;
  protected readonly limitRows = LIMIT_ROWS;
  protected readonly recommendedPlanCode = RECOMMENDED_PLAN_CODE;

  formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  }
}
