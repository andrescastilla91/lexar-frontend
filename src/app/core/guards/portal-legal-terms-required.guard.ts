import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PortalAuthService } from '../services/portal-auth.service';

/**
 * F44 §LEG-03 (ola 4): espejo en frontend de `PortalLegalTermsGuard` del
 * backend. Va después de `portalAuthGuard` en el layout del portal.
 */
export const portalLegalTermsRequiredGuard: CanActivateFn = (): boolean | UrlTree => {
  const portalAuthService = inject(PortalAuthService);
  const router = inject(Router);

  if (portalAuthService.currentPortalUser()?.legalTermsPending) {
    return router.createUrlTree(['/portal/aceptar-terminos']);
  }

  return true;
};
