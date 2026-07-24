import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PlatformAdminService } from '../services/platform-admin.service';

export const platformAdminGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const platformAdminService = inject(PlatformAdminService);
  const router = inject(Router);

  if (platformAdminService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
