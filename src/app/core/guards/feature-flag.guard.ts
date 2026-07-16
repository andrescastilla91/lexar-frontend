import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { environment } from '../../../environments/environment';

export const chatbotFeatureGuard: CanActivateFn = (): boolean | UrlTree => {
  if (environment.features.chatbot) {
    return true;
  }

  const router = inject(Router);
  return router.createUrlTree(['/dashboard']);
};
