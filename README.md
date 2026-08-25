# LexAr Frontend

SPA/PWA de **LexAr Suite** — SaaS multi-tenant para firmas de servicios legales y jurídicos: dashboard, procesos/expedientes, clientes, asesores, documentos, usuarios y roles.

## Stack

Angular 20 (standalone components + signals) · Tailwind CSS 4 · Autenticación por cookies HttpOnly (interceptor con `withCredentials`; nada de tokens en localStorage) · RBAC espejado del backend (guard + directiva `hasPermission`) · Node 24.

## Estructura

```
src/app/
├── core/          # servicios API, interceptores (auth, error), guards,
│                  # modelos, directivas y componentes compartidos (data-table, pagination)
├── features/      # pantallas: auth, dashboard, processes, clients, users,
│                  # advisors, documents, roles, chatbot
└── layout/        # main-layout (sidebar + header)
```

El diseño se rige por el [Design System](../docs/02-design-system/README.md) (tokens Tailwind 4 en `tokens.css`; prohibidos colores crudos y emojis como iconos en código nuevo).

## Environments (2 ambientes)

`src/environments/environment.ts` es el **único environment del repo** (local, sin datos sensibles: `apiUrl: http://localhost:3040/api`). El environment de **producción no existe en el repositorio**: lo genera el `Dockerfile` en build a partir de los ARGs `API_URL` (=`/api`, relativo al mismo origen) y `APP_VERSION`, provistos por el `docker-compose` local o por Railway.

## Desarrollo local

```bash
npm install
npm start            # ng serve → http://localhost:4400, backend en localhost:3040
```

El backend usa el puerto **3040** en host-mode: Piggy ya ocupa 3000/3010/3020/3030 (kids/pro/auth/core) — ver [`../lexar-backend/.env.example`](../lexar-backend/.env.example). El frontend usa **4400** en vez del 4200 default de Angular CLI, ya que ese también está tomado por otro proyecto Piggy (`angular.json` → `architect.serve.options.port`).

Con Docker (app completa detrás de nginx, cookies first-party): ver [`../docs/03-infraestructura/README.md`](../docs/03-infraestructura/README.md) → `http://localhost:4300`.

Build: `npx ng build` (configuración production por defecto) · Tests: `npm test`.

## Tests (F1)

**Unit (Jest):** `npm test` corre la suite completa (109 specs). Reemplazó Karma/Jasmine — no hay que instalar Chrome. `npm run test:watch` para desarrollo, `npm test -- --coverage` para cobertura.

**Cobertura (HU-QA-GATE-1):** `coverageThreshold` en `jest.config.js` — el CI (`npm test -- --ci --coverage` en `.github/workflows/ci.yml`) falla si la cobertura cae por debajo del umbral. Umbral vigente (medido 2026-08-24, `All files`, redondeado hacia abajo — no aspiracional):

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 83% | 68% | 74% | 84% |

**Regla de ratchet**: el umbral solo sube, nunca baja — al agregar tests que superen el umbral vigente, subirlo en el mismo PR (redondeado hacia abajo al valor recién medido). Objetivo: **80%** líneas/ramas en `src/app/core` + features críticas (ya superado a nivel global; falta granularidad por carpeta).

**Auditoría de dependencias (HU-SEC-3):** `node scripts/audit-gate.js` (paso de CI) corre `npm audit --omit=dev --audit-level=high --json` y falla ante high/critical en dependencias de producción sin excepción vigente en `security/audit-exceptions.json` (misma mecánica que `lexar-backend`, ver su README para el detalle). Mecanismo primario: Dependabot (`.github/dependabot.yml`).

**E2E (Playwright):** `npm run e2e` requiere el backend corriendo en el puerto 3040 (`npm run start:dev` en `lexar-backend`, apuntando a Postgres) y este frontend (`npm start`, se levanta solo vía `webServer` de Playwright si no está corriendo). Cada test registra su propio tenant real vía `POST /auth/register` (`e2e/shared/tenant-fixture.ts`), sin tokens fabricados. Specs en `e2e/specs/`; page objects en `e2e/pages/`. `npm run e2e:ui` para el modo interactivo.

Para agregar un caso nuevo: si es lógica de guard/interceptor/servicio → spec Jest junto al archivo (`*.spec.ts`); si es un flujo de usuario a través de rutas reales → spec Playwright en `e2e/specs/`, reutilizando `tenant-fixture` y los page objects existentes.

## Arquitectura de despliegue

El contenedor sirve la SPA con **nginx** y proxya `/api/*` al backend por red privada (local y Railway) — el backend nunca se expone públicamente y las cookies son first-party. Producción en **Railway** vía integración nativa con GitHub: push a `main` → workflow `ci.yml` (build de verificación) → si queda en verde, Railway construye el `Dockerfile` y despliega ("Wait for CI"). Detalle: [`../docs/04-plan-remediacion/I3-railway-cicd.md`](../docs/04-plan-remediacion/I3-railway-cicd.md).

## Documentación

Auditoría técnica, design system, infraestructura y plan de remediación: [`../docs/`](../docs/README.md).
