import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * F11 (S10): espejo en frontend del bloqueo real que hace el backend
 * (TwoFactorRequiredInterceptor) — si la empresa exige 2FA y el usuario aún
 * no lo activó, lo manda a la pantalla de enrolamiento forzado en vez de
 * dejarlo navegar y toparse con un 403 en la primera llamada a la API.
 */
export const twoFactorRequiredGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (user?.companyRequire2fa && !user.twoFactorEnabled) {
    return router.createUrlTree(['/activar-2fa']);
  }

  return true;
};
