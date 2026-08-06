import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { PortalAuthService } from '../services/portal-auth.service';

// F16: espejo de auth.interceptor.ts pero para /portal/* — deliberadamente
// aislado (nunca comparte lógica con la sesión interna ni con la de
// platform-admin), ver el comentario simétrico en auth.interceptor.ts sobre
// por qué ambos deben ignorarse mutuamente por completo.
function isPortalEndpoint(url: string): boolean {
  return url.includes('/portal/');
}

function isPortalSessionProbeEndpoint(url: string): boolean {
  return url.includes('/portal/auth/me');
}

function isPortalAuthActionEndpoint(url: string): boolean {
  return (
    url.includes('/portal/auth/login') ||
    url.includes('/portal/auth/refresh') ||
    url.includes('/portal/auth/logout') ||
    url.includes('/portal/auth/forgot-password') ||
    url.includes('/portal/auth/reset-password') ||
    url.includes('/portal/auth/accept-invitation')
  );
}

export const portalAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPortalEndpoint(req.url)) {
    return next(req);
  }

  const router = inject(Router);
  const portalAuthService = inject(PortalAuthService);

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isPortalAuthActionEndpoint(req.url)) {
        return throwError(() => error);
      }

      const isProbe = isPortalSessionProbeEndpoint(req.url);

      return portalAuthService.refreshToken().pipe(
        switchMap((success) => {
          if (success) {
            return next(authReq);
          }
          if (!isProbe) {
            router.navigate(['/portal/login']);
          }
          return throwError(() => error);
        }),
        catchError((refreshError) => {
          if (!isProbe) {
            router.navigate(['/portal/login']);
          }
          return throwError(() => refreshError);
        })
      );
    })
  );
};
