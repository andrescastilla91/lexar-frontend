import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Clonar la petición con withCredentials para enviar cookies HTTP-only
  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error) => {
      // Si es 401 y NO es endpoint de autenticación, intentar refresh
      if (error.status === 401) {
        const isAuthEndpoint = req.url.includes('/auth/login') || 
                               req.url.includes('/auth/register') || 
                               req.url.includes('/auth/refresh') ||
                               req.url.includes('/auth/logout');
        
        if (!isAuthEndpoint) {
          // Intentar refrescar el token
          return authService.refreshToken().pipe(
            take(1),
            switchMap((success) => {
              if (success) {
                // Token refrescado, reintentar la solicitud original
                return next(authReq);
              } else {
                // Refresh falló, redirigir a login
                router.navigate(['/login']);
                return throwError(() => error);
              }
            }),
            catchError((refreshError) => {
              // Error en refresh, redirigir a login
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        }
      }
      
      return throwError(() => error);
    })
  );
};
