// Docker Compose local (frontend :4300) y stg (lexar-stg.ribongrupojuridico.com)
// sirven `/api` por el mismo nginx que sirve el frontend — mismo origen que
// `E2E_BASE_URL`. Solo el flujo `ng serve` sin proxy (baseURL 4400 por
// defecto) necesita un origen de API separado, porque `ng serve` no tiene
// proxy.conf configurado — de ahí el fallback final a :3040 (puerto de debug
// del backend en docker-compose.yml, ver infra/docker-compose.yml).
export const E2E_API_ORIGIN =
  process.env.E2E_API_ORIGIN ??
  process.env.E2E_BASE_URL ??
  'http://localhost:3040';

// Mailpit expone su API en :8025 directo en el host (docker-compose.yml),
// sin pasar por el nginx del frontend — por eso no sigue a E2E_BASE_URL como
// E2E_API_ORIGIN. Ver tenant-fixture.ts.
export const E2E_MAILPIT_ORIGIN =
  process.env.E2E_MAILPIT_ORIGIN ?? 'http://localhost:8025';
