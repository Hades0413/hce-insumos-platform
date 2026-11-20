#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Genera .env con secretos aleatorios, el par de claves ES256 del JWT y una PKI
# interna (CA propia + certificados de NATS y SQL Server) para TLS VERIFICADO
# entre servicios. Idempotente: no sobrescribe un .env existente (--force regenera).
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

# Contraseña de usuarios demo ALEATORIA (nunca una contraseña publicada en docs).
SEED_PASSWORD="${SEED_USERS_PASSWORD:-Hce-$(openssl rand -hex 4)-$(openssl rand -hex 4 | tr 'a-f' 'A-F')-Demo}"

# --- PKI interna: CA de 10 años (solo firma certificados de servicios internos)
TLS_DIR="secrets/tls"
mkdir -p "$TLS_DIR" && chmod 700 secrets "$TLS_DIR"
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 3650 \
  -subj "/CN=HCE Insumos Internal CA" -keyout "$tmp/ca.key" -out "$TLS_DIR/ca.crt" 2>/dev/null
issue_cert() { # $1 = nombre DNS del servicio en la red de Docker
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -subj "/CN=$1" \
    -keyout "$TLS_DIR/$1.key" -out "$tmp/$1.csr" 2>/dev/null
  printf "subjectAltName=DNS:%s,DNS:localhost\nextendedKeyUsage=serverAuth\nkeyUsage=digitalSignature,keyEncipherment\n" "$1" > "$tmp/$1.ext"
  openssl x509 -req -in "$tmp/$1.csr" -CA "$TLS_DIR/ca.crt" -CAkey "$tmp/ca.key" -CAserial "$tmp/ca.srl" -CAcreateserial \
    -days 825 -extfile "$tmp/$1.ext" -out "$TLS_DIR/$1.crt" 2>/dev/null
}
issue_cert nats
issue_cert sqlserver
chmod 600 "$TLS_DIR"/*.key
# La clave de la CA se descarta (queda solo en el tmp borrado): nadie puede emitir más certificados.

umask 077
cat > .env <<ENV
# Generado por scripts/setup.sh el $(date -u +%Y-%m-%dT%H:%M:%SZ). No versionar.
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
SEED_DEMO_DATA=true
SEED_USERS_PASSWORD=${SEED_PASSWORD}

FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_API_URL=http://localhost:4000/api/v1
# Desarrollo local por http://localhost. En producción (HTTPS): COOKIE_SECURE=true y SWAGGER_ENABLED=false.
COOKIE_SECURE=false
SWAGGER_ENABLED=true
SWAGGER_DEMO_PASSWORD=${SEED_PASSWORD}

IGV_RATE=0.18
MARGEN_VENTA=0.35

LOG_LEVEL=info
GRAFANA_ADMIN_PASSWORD=$(secret | cut -c1-20)
ENV

echo "OK: .env generado con secretos aleatorios (permisos 600)."
echo "OK: PKI interna en ${TLS_DIR}/ (TLS verificado para NATS y SQL Server)."
echo "  Usuarios demo: admin@hce.local | almacen@hce.local | farmacia@hce.local"
echo "  Contraseña demo (guárdala; también está en .env → SEED_USERS_PASSWORD): ${SEED_PASSWORD}"
