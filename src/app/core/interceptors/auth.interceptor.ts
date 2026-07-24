import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function isSessionProbeEndpoint(url: string): boolean {
  return url.includes('/auth/me');
}

function isAuthActionEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

// F9: /admin/* usa una cookie y un guard totalmente aparte (sin refresh
// token) — un 401 ahí nunca debe disparar el refresh de sesión de tenant.
function isPlatformAdminEndpoint(url: string): boolean {
  return url.includes('/admin/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status !== 401 || isSessionProbeEndpoint(req.url)) {
        return throwError(() => error);
      }

      if (isPlatformAdminEndpoint(req.url)) {
        router.navigate(['/admin/login']);
        return throwError(() => error);
      }

      if (isAuthActionEndpoint(req.url)) {
        router.navigate(['/login']);
        return throwError(() => error);
      }

      return authService.refreshToken().pipe(
        switchMap((success) => {
          if (success) {
            return next(authReq);
          }
          router.navigate(['/login']);
          return throwError(() => error);
        }),
        catchError((refreshError) => {
          console.error('Error en refresh:', refreshError);
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
