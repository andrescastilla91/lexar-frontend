import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { PlatformAdminService } from './core/services/platform-admin.service';
import { catchError, of } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
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
  ],
};
