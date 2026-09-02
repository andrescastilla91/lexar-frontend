import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * BUG-11: bloquea el acceso directo por URL a pantallas dirigidas solo al
 * dueño de la empresa (isOwner) — hoy usado en /onboarding. Espejo del
 * filtro que ya aplica el backend en DashboardService.getOnboardingChecklist
 * (devuelve null a un no-dueño); este guard cierra el acceso por URL, que
 * el backend por sí solo no puede evitar. Un usuario invitado que navegue
 * ahí a mano vuelve a /dashboard sin mensaje de error — no es una acción
 * prohibida con feedback, es una pantalla que simplemente no le aplica.
 */
export const ownerOnlyGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (user?.isOwner !== true) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
