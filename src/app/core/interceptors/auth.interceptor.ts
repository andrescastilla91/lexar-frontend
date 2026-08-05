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

// Bug corregido 2026-08-05: /admin/auth/me es la sonda de sesión de
// platform-admin del bootstrap (APP_INITIALIZER, igual que /auth/me para
// tenant) — se dispara en CADA carga de la app, para cualquier visitante,
// no solo para quien usa el panel de plataforma. Su 401 es el caso normal
// (nadie tiene sesión de admin) y nunca debe forzar una navegación: antes
// de este fix, cualquier visita anónima a una página pública (activar
// cuenta, login, registro) era expulsada a /admin/login apenas cargaba,
// sin llegar nunca al contenido real. `platformAdminGuard` ya protege
// /admin/** de forma independiente, así que no hace falta que el
// interceptor también navegue en este caso.
function isAdminSessionProbeEndpoint(url: string): boolean {
  return url.includes('/admin/auth/me');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isPlatformAdminEndpoint(req.url)) {
        if (!isAdminSessionProbeEndpoint(req.url)) {
          router.navigate(['/admin/login']);
        }
        return throwError(() => error);
      }

      if (isAuthActionEndpoint(req.url)) {
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // Bug corregido 2026-07-27: /auth/me es la sonda de sesión del
      // bootstrap (APP_INITIALIZER) — su 401 puede significar "access token
      // vencido, pero el refresh token sigue vigente" (recarga de página
      // normal) o "visita anónima sin sesión" (landing/registro/nadie logueado).
      // Antes se propagaba el 401 tal cual sin intentar refrescar, así que
      // un usuario con sesión real perdía su sesión en cada reload en cuanto
      // el access token (más corto) vencía, aunque el refresh token (más
      // largo) siguiera siendo válido. Ahora sí se intenta el refresh en
      // silencio; solo se evita el `router.navigate(['/login'])` si falla,
      // para no redirigir a un visitante anónimo en una página pública.
      const isProbe = isSessionProbeEndpoint(req.url);

      return authService.refreshToken().pipe(
        switchMap((success) => {
          if (success) {
            return next(authReq);
          }
          if (!isProbe) {
            router.navigate(['/login']);
          }
          return throwError(() => error);
        }),
        catchError((refreshError) => {
          if (!isProbe) {
            console.error('Error en refresh:', refreshError);
            router.navigate(['/login']);
          }
          return throwError(() => refreshError);
        })
      );
    })
  );
};
