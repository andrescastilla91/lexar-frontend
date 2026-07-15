/**
 * Environment LOCAL — único environment committeado al repositorio.
 * Solo datos NO sensibles.
 *
 * El environment de PRODUCCIÓN no vive en el repo: se genera durante el
 * build de Docker a partir de build ARGs (API_URL, APP_VERSION), tanto en
 * el docker-compose local como en el build de Railway. Ver Dockerfile.
 */
export const environment = {
  production: false,
  environment: 'local',
  version: 'dev',
  // Backend local: `npm run start:dev` (puerto 3000) o el contenedor con
  // puerto debug expuesto (3030). Incluye el prefijo global /api.
  apiUrl: 'http://localhost:3000/api',
  features: {
    // El chatbot consume MockDataService (sin backend real). Ver A2 en
    // docs/04-plan-remediacion/A-arquitectura-y-ui.md.
    chatbot: false,
  },
};
