import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { PlanFeatures } from '../models/subscription-backend.model';

export interface PlanGateErrorBody {
  message: string;
  code: 'FEATURE_NOT_IN_PLAN' | 'LIMIT_REACHED';
  feature?: keyof PlanFeatures;
  limit?: string;
}

/**
 * Cuerpo mínimo que necesitamos del error HTTP crudo. `error.interceptor.ts`
 * pisa `.message` con un texto genérico para 403 (BUG-19, sin resolver aún),
 * pero conserva `.error` con el body real del backend — por eso este
 * servicio lee `error.error`, no `error.message` (mismo "rodeo manual" que
 * ya usa `legal-processes.service.ts`).
 */
interface RawHttpError {
  error?: PlanGateErrorBody;
}

/**
 * F7-R3: cuando un tenant topa con un gate de plan (`FEATURE_NOT_IN_PLAN` de
 * `FeatureGuard`, `LIMIT_REACHED` de `SubscriptionService.check*Limit`) en
 * cualquier parte de la app, este servicio muestra el mensaje real del
 * backend en un toast con un CTA que lleva a "Plan y facturación" con el
 * plan sugerido resaltado — nunca un error genérico sin salida (mismo
 * principio de "degradación elegante" del anexo F20).
 */
@Injectable({ providedIn: 'root' })
export class PlanUpgradeService {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly toast = inject(ToastService);

  /** Type guard: ¿este error de HTTP es un gate de plan? */
  isPlanGateError(error: unknown): error is RawHttpError & { error: PlanGateErrorBody } {
    const code = (error as RawHttpError | undefined)?.error?.code;
    return code === 'FEATURE_NOT_IN_PLAN' || code === 'LIMIT_REACHED';
  }

  /**
   * Muestra el toast con el mensaje real del backend y el CTA "Ver planes"
   * apuntando al plan sugerido. Si por lo que sea no se puede determinar
   * un plan concreto (catálogo vacío, dato inesperado), el CTA igual lleva
   * a la pestaña de planes, solo que sin resaltar ninguno.
   */
  promptUpgrade(error: RawHttpError & { error: PlanGateErrorBody }): void {
    const body = error.error;
    this.resolveSuggestedPlanCode(body).subscribe((planCode) => {
      this.toast.error(body.message, {
        label: 'Ver planes',
        routerLink: ['/configuracion'],
        queryParams: planCode ? { tab: 'plan', suggested: planCode } : { tab: 'plan' },
      });
    });
  }

  private resolveSuggestedPlanCode(body: PlanGateErrorBody): Observable<string | null> {
    return forkJoin({
      entitlements: this.subscriptionService.getEntitlements(),
      plans: this.subscriptionService.getPlanCatalog(),
    }).pipe(
      map(({ entitlements, plans }) => {
        const sorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

        if (body.code === 'FEATURE_NOT_IN_PLAN' && body.feature) {
          const feature = body.feature;
          const match = sorted.find((plan) => plan.features[feature] === true);
          return match?.code ?? null;
        }

        if (body.code === 'LIMIT_REACHED') {
          // Los límites del catálogo son monotónicamente crecientes por
          // plan (ver billing-plan-catalog.ts) — el siguiente escalón por
          // sortOrder siempre resuelve el límite actual, sin necesidad de
          // comparar el valor numérico campo por campo.
          const current = sorted.find((plan) => plan.code === entitlements.planCode);
          const currentSortOrder = current?.sortOrder ?? -1;
          const next = sorted.find((plan) => plan.sortOrder > currentSortOrder);
          return next?.code ?? null;
        }

        return null;
      })
    );
  }
}
