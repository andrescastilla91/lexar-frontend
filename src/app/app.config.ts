import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { portalAuthInterceptor } from './core/interceptors/portal-auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { PlatformAdminService } from './core/services/platform-admin.service';
import { PortalAuthService } from './core/services/portal-auth.service';
import { LexArTitleStrategy } from './core/services/lexar-title-strategy';
import { catchError, of } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // F29(b): reemplaza el DefaultTitleStrategy para concatenar
    // "Sección · Sufijo" desde environment.brandName en un solo lugar —
    // ver core/services/lexar-title-strategy.ts.
    { provide: TitleStrategy, useClass: LexArTitleStrategy },
    provideHttpClient(
      withInterceptors([authInterceptor, portalAuthInterceptor, errorInterceptor])
    ),
    // HU-INFRA-3: sin sentryDsn, Sentry.init() (main.ts) ya es no-op, así que
    // este handler tampoco manda nada — sigue delegando a la consola.
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    // Cargar usuario desde /me al iniciar la aplicación (F5/refresh)
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.getProfile().pipe(catchError(() => of(null)));
    }),
    // F9: igual que arriba pero para la sesión de platform admin — cookie
    // independiente (platform_access_token), no interfiere con la de tenant.
    provideAppInitializer(() => {
      const platformAdminService = inject(PlatformAdminService);
      return platformAdminService.getProfile().pipe(catchError(() => of(null)));
    }),
    // F16: igual que arriba pero para la sesión del portal de cliente —
    // cookie independiente (portal_access_token, path /api/portal), no
    // interfiere con tenant ni con platform-admin.
    provideAppInitializer(() => {
      const portalAuthService = inject(PortalAuthService);
      return portalAuthService.getProfile().pipe(catchError(() => of(null)));
    }),
  ],
};
