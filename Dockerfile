# ============================================================
# LexAr Frontend — Angular + nginx (patrón piggy-infra)
# Las URLs quedan HORNEADAS en la imagen vía build args.
#   Local:   API_URL=/api (compose lo pasa)
#   Railway: API_URL=/api (nginx del propio contenedor hace proxy)
# ============================================================

# ---------- Etapa 1: build Angular ----------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG API_URL=/api
ARG APP_VERSION=0.0.0

# El environment de PRODUCCIÓN no existe en el repo: se genera aquí desde
# los build ARGs (docker-compose local y Railway los proveen). El archivo
# committeado (environment.ts) solo contiene valores locales no sensibles.
RUN printf '%s\n' \
  "export const environment = {" \
  "  production: true," \
  "  environment: 'production'," \
  "  version: '${APP_VERSION}'," \
  "  apiUrl: '${API_URL}'," \
  "};" \
  > src/environments/environment.ts

RUN npx ng build --configuration production

# ---------- Etapa 2: nginx ----------
FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/dist/lex-ar-frontend/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.d/15-lexar-env.envsh
RUN chmod +x /docker-entrypoint.d/15-lexar-env.envsh && rm -f /etc/nginx/conf.d/default.conf

# PORT: 80 local / dinámico en Railway
ENV PORT=80 \
    BACKEND_HOST=lexar_backend:3000 \
    NAMESERVER=127.0.0.11

EXPOSE 80

# Pega a /api/health (proxeado al backend), no solo a "/" — "/" siempre
# devuelve 200 (sirve el index.html estático) aunque el proxy al backend
# esté roto (p.ej. el resolver DNS mal configurado), así que no detecta
# ese tipo de fallo. /api/health sí ejercita la cadena completa nginx→backend.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:${PORT:-80}/api/health" || exit 1

CMD ["nginx", "-g", "daemon off;"]
