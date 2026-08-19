import { defineConfig, devices } from '@playwright/test';

// Sin E2E_BASE_URL: flujo local de siempre (`ng serve` en :4400, arrancado
// por `webServer` de más abajo). Con E2E_BASE_URL: se apunta a un entorno ya
// vivo (docker-compose local en :4300, o stg en CI — ver HU-FE-E2E-1) y NO
// se levanta ningún server propio, porque ya hay uno corriendo del lado de
// destino.
const explicitBaseURL = process.env.E2E_BASE_URL;
const baseURL = explicitBaseURL ?? 'http://localhost:4400';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 1 worker: el login del backend tiene @Throttle({ ttl: 60_000, limit: 5 })
  // por IP (protección de fuerza bruta, no se toca para conveniencia de
  // tests). Con más de 1 worker, varios tenants distintos intentan loguearse
  // casi simultáneo desde la misma IP local y superan el límite -> 429
  // silencioso, el test se queda pegado en /login. Ver HU-FE-E2E-1.
  workers: 1,
  // 'github' anota el PR; 'html' además deja un reporte navegable (con
  // traces embebidos) como artefacto descargable del run — ver ci.yml.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'html',
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: explicitBaseURL
    ? undefined
    : {
        command: 'npm start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
