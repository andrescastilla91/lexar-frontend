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

// F16: /portal/* autentica con una cookie e identidad totalmente aparte
// (portal_access_token, sin roles internos) — la maneja exclusivamente
// portal-auth.interceptor.ts. Un 401 de portal jamás debe disparar el
// refresh interno ni navegar a /login (mismo razonamiento que
// isPlatformAdminEndpoint arriba, en la dirección opuesta de confianza).
function isPortalEndpoint(url: string): boolean {
  return url.includes('/portal/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (isPortalEndpoint(req.url)) {
    return next(req.clone({ withCredentials: true }));
  }

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

      // Bug corregido 2026-08-06: esta rama también se dispara cuando ESTA
      // MISMA petición es el refresh recursivo lanzado más abajo (isProbe)
      // al fallar la sonda /auth/me en CADA carga de página, para CUALQUIER
      // ruta. Navegar aquí sin mirar el contexto secuestraba la navegación
      // inicial y expulsaba a /login a cualquier visitante anónimo de una
      // página pública que no fuera /login (portal/login, portal/activar-
      // cuenta, admin/login...) — la redirección ganaba la carrera contra la
      // navegación real del router hacia la URL pedida. Los componentes de
      // login/registro/forgot/reset ya muestran su propio error inline, y el
      // caso real de "la sesión murió con el usuario ya adentro" lo sigue
      // cubriendo el bloque de abajo (isProbe) para la petición ORIGINAL que
      // falló — no para este refresh recursivo. No volver a agregar un
      // navigate() aquí.
      if (isAuthActionEndpoint(req.url)) {
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
