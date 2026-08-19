export const environment = {
  production: false,
  environment: 'local',
  version: 'dev',
  apiUrl: 'http://localhost:3040/api',
  // HU-INFRA-3: vacío en local a propósito — no queremos ruido de pruebas
  // locales mezclado con errores reales. Sentry.init() con dsn vacío queda
  // no-op. En producción se hornea en build desde el ARG SENTRY_DSN (ver
  // Dockerfile).
  sentryDsn: '',
};
