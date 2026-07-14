#!/bin/sh
# Se instala como /docker-entrypoint.d/15-lexar-env.envsh
# Los .envsh son *sourced* por el entrypoint oficial de nginx ANTES de
# 20-envsubst-on-templates.sh, por lo que los exports sí afectan al template.
#
# En Railway el resolver DNS del private networking es IPv6 y debe ir con
# corchetes; en Docker local es 127.0.0.11.

if [ -n "${RAILWAY_ENVIRONMENT:-}" ]; then
  export NAMESERVER="${NAMESERVER:-[fd12::10]}"
else
  export NAMESERVER="${NAMESERVER:-127.0.0.11}"
fi

export PORT="${PORT:-80}"

echo "[lexar-frontend] PORT=$PORT BACKEND_HOST=$BACKEND_HOST NAMESERVER=$NAMESERVER"
