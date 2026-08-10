import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { Observable } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';

/**
 * F7: el chatbot ya no se gatea con `environment.features.chatbot` (flag
 * fija de build) sino con el entitlement `chatbot` del plan del tenant —
 * mismo criterio que usa el backend en `@RequiresFeature('chatbot')`.
 */
export const chatbotFeatureGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const subscriptionService = inject(SubscriptionService);
  const router = inject(Router);

  return subscriptionService.getEntitlements().pipe(
    map((entitlements) =>
      entitlements.features.chatbot ? true : router.createUrlTree(['/dashboard'])
    ),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};
