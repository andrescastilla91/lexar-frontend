import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea el acceso a toda la app (dashboard, onboarding, todo) si el
 * usuario es el dueño de la empresa (isOwner) y aún no verificó su correo —
 * espejo en frontend del bloqueo real que ya hace el backend
 * (EmailVerificationInterceptor). Los usuarios invitados no quedan sujetos
 * a esta regla (isOwner es false para ellos).
 */
export const emailVerifiedGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();

  if (user?.isOwner && user.emailVerified === false) {
    return router.createUrlTree(['/verificar-pendiente']);
  }

  return true;
};
