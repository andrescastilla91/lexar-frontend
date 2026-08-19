import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import * as Sentry from '@sentry/angular';

// HU-INFRA-3: sentryDsn vacío (local, o build sin el ARG) -> el SDK queda
// no-op. Debe correr antes de bootstrapApplication.
Sentry.init({
  dsn: environment.sentryDsn || undefined,
  environment: environment.environment,
  release: environment.version,
  sendDefaultPii: false,
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
