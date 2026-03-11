import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Send HTTP-only cookies on every request
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error) => {
      // Si no es 401, propagar el error
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Si el error 401 viene de endpoints de autenticación, no intentar refresh
      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/logout');

      if (isAuthEndpoint) {
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
          console.error('❌ Error en refresh:', refreshError);
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
