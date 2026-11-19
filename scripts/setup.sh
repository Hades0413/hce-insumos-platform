#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Genera .env con secretos aleatorios y el par de claves ES256 del JWT.
# Idempotente: no sobrescribe un .env existente (usa --force para regenerar).
# Requisitos: openssl, base64.
# -----------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env && "${1:-}" != "--force" ]]; then
  echo ".env ya existe. Usa ./scripts/setup.sh --force para regenerarlo (¡borra los datos de BD!)."
  exit 0
fi

command -v openssl >/dev/null || { echo "Se requiere openssl" >&2; exit 1; }

# Contraseña que cumple la política de SQL Server (mayúscula, minúscula, dígito, símbolo).
sqlpass() { echo "Hce_$(openssl rand -hex 12)_A9!"; }
secret()  { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
openssl ecparam -name prime256v1 -genkey -noout -out "$tmp/ec.pem" 2>/dev/null
openssl pkcs8 -topk8 -nocrypt -in "$tmp/ec.pem" -out "$tmp/private.pem"
openssl ec -in "$tmp/ec.pem" -pubout -out "$tmp/public.pem" 2>/dev/null

SEED_PASSWORD="${SEED_USERS_PASSWORD:-Hce.Demo.2026!}"

umask 077
cat > .env <<ENV
# Generado por scripts/setup.sh el $(date -u +%Y-%m-%dT%H:%M:%SZ). NO versionar.
MSSQL_SA_PASSWORD=$(sqlpass)
INSUMOS_DB_PASSWORD=$(sqlpass)
AUTH_DB_PASSWORD=$(sqlpass)

NATS_GATEWAY_PASSWORD=$(secret)
NATS_AUTH_PASSWORD=$(secret)
NATS_INVENTORY_PASSWORD=$(secret)

JWT_PRIVATE_KEY_B64=$(base64 -w0 "$tmp/private.pem" 2>/dev/null || base64 < "$tmp/private.pem" | tr -d '\n')
JWT_PUBLIC_KEY_B64=$(base64 -w0 "$tmp/public.pem" 2>/dev/null || base64 < "$tmp/public.pem" | tr -d '\n')

CSRF_SECRET=$(secret)

SEED_DEMO_USERS=true
SEED_USERS_PASSWORD=${SEED_PASSWORD}

FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:4000/api/v1
COOKIE_SECURE=false
SWAGGER_ENABLED=true

IGV_RATE=0.18
MARGEN_VENTA=0.35

LOG_LEVEL=info
GRAFANA_ADMIN_PASSWORD=$(secret | cut -c1-20)
ENV

echo "✔ .env generado con secretos aleatorios (permisos 600)."
echo "  Usuarios demo: admin@hce.local | almacen@hce.local | farmacia@hce.local"
echo "  Contraseña demo: ${SEED_PASSWORD}"
