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

`src/environments/environment.ts` es el **único environment del repo** (local, sin datos sensibles: `apiUrl: http://localhost:3000/api`). El environment de **producción no existe en el repositorio**: lo genera el `Dockerfile` en build a partir de los ARGs `API_URL` (=`/api`, relativo al mismo origen) y `APP_VERSION`, provistos por el `docker-compose` local o por Railway.

## Desarrollo local

```bash
npm install
npm start            # ng serve → http://localhost:4200, backend en localhost:3000
```

Con Docker (app completa detrás de nginx, cookies first-party): ver [`../docs/03-infraestructura/README.md`](../docs/03-infraestructura/README.md) → `http://localhost:4300`.

Build: `npx ng build` (configuración production por defecto) · Tests: `npm test`.

## Arquitectura de despliegue

El contenedor sirve la SPA con **nginx** y proxya `/api/*` al backend por red privada (local y Railway) — el backend nunca se expone públicamente y las cookies son first-party. Producción en **Railway** vía integración nativa con GitHub: push a `main` → workflow `ci.yml` (build de verificación) → si queda en verde, Railway construye el `Dockerfile` y despliega ("Wait for CI"). Detalle: [`../docs/04-plan-remediacion/I3-railway-cicd.md`](../docs/04-plan-remediacion/I3-railway-cicd.md).

## Documentación

Auditoría técnica, design system, infraestructura y plan de remediación: [`../docs/`](../docs/README.md).
