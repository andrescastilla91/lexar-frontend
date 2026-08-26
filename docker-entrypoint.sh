#!/bin/sh
# Se instala como /docker-entrypoint.d/15-lexar-env.envsh
# Los .envsh son *sourced* por el entrypoint oficial de nginx ANTES de
# 20-envsubst-on-templates.sh, por lo que los exports sí afectan al template.
#
# En Railway el resolver DNS del private networking es IPv6 y debe ir con
# corchetes; en Docker local es 127.0.0.11.
#
# Historial (2026-07-14): se intentó detectar Railway chequeando primero
# RAILWAY_ENVIRONMENT (no existe como variable, ver
# docs.railway.com/variables/reference) y después RAILWAY_ENVIRONMENT_NAME
# (documentada como provista "a todos los builds y deployments", pero en la
# práctica no estaba presente en runtime cuando corrió este script — log del
# incidente en memoria de proyecto). En vez de seguir apostando a detectar
# una variable específica de Railway, invertimos el default: asumimos
# Railway (`[fd12::10]`) salvo que NAMESERVER ya venga seteado desde afuera.
# El entorno local (infra/docker-compose.yml) fija NAMESERVER=127.0.0.11
# explícitamente en el `environment:` del servicio, así que ese valor externo
# siempre gana sobre este default y el fallback de abajo nunca se usa ahí.
export NAMESERVER="${NAMESERVER:-[fd12::10]}"

export PORT="${PORT:-80}"

# BUG-13: origen(es) extra para connect-src en la CSP (security-headers.conf),
# más allá de 'self' y "https:". Vacío en Railway (stg/prod: R2 es https, ya
# cubierto) — solo el docker-compose local lo fija, al origen público de
# MinIO (http://localhost:9000), que es http y de puerto distinto al del
# propio frontend. Debe exportarse SIEMPRE (aunque sea vacío): envsubst deja
# el placeholder ${CSP_CONNECT_SRC_EXTRA} literal si la variable no existe.
export CSP_CONNECT_SRC_EXTRA="${CSP_CONNECT_SRC_EXTRA:-}"

echo "[lexar-frontend] PORT=$PORT BACKEND_HOST=$BACKEND_HOST NAMESERVER=$NAMESERVER CSP_CONNECT_SRC_EXTRA=$CSP_CONNECT_SRC_EXTRA"
