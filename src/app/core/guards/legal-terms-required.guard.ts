import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * F44 §LEG-01 (ola 2): espejo en frontend del bloqueo real que hace el
 * backend (`LegalTermsRequiredInterceptor`) — si el usuario tiene
 * pendiente aceptar la versión vigente de los términos internos, lo manda
 * a la pantalla de aceptación en vez de dejarlo navegar y toparse con un
 * 403 en la primera llamada a la API. Va al final de la cadena
 * (`authGuard → emailVerifiedGuard → twoFactorRequiredGuard →
 * legalTermsRequiredGuard`), mismo orden que la cadena de interceptors del
 * backend — decisión del propietario (2026-09-30): agregar al final, sin
 * reordenar lo ya validado.
 */
export const legalTermsRequiredGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (user?.legalTermsPending) {
    return router.createUrlTree(['/aceptar-terminos']);
  }

  return true;
};
