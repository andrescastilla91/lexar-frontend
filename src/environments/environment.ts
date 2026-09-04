export const environment = {
  production: false,
  environment: 'local',
  version: 'dev',
  apiUrl: 'http://localhost:3040/api',
  // F29(b) — ajuste 2026-09-03: nombre de marca centralizado. Lo consume
  // LexArTitleStrategy (core/services/lexar-title-strategy.ts) para
  // concatenar el título de pestaña por ruta — un rename de marca solo
  // toca este valor (y el ARG BRAND_NAME del Dockerfile en prod), no las
  // ~30 rutas de app.routes.ts.
  brandName: 'LexAr',
  // HU-INFRA-3: vacío en local a propósito — no queremos ruido de pruebas
  // locales mezclado con errores reales. Sentry.init() con dsn vacío queda
  // no-op. En producción se hornea en build desde el ARG SENTRY_DSN (ver
  // Dockerfile).
  sentryDsn: '',
};
