#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Ejecuta los scripts de database/init en orden contra SQL Server.
# Idempotente: todos los scripts usan IF NOT EXISTS / CREATE OR ALTER.
# Se usa desde el contenedor "db-init" de docker-compose (o a mano).
#
# Variables requeridas: MSSQL_SA_PASSWORD, INSUMOS_DB_PASSWORD, AUTH_DB_PASSWORD
# Opcionales: DB_HOST (sqlserver), DB_PORT (1433), SEED_DEMO_DATA (true)
# -----------------------------------------------------------------------------
set -euo pipefail

: "${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD es obligatorio}"
: "${INSUMOS_DB_PASSWORD:?INSUMOS_DB_PASSWORD es obligatorio}"
: "${AUTH_DB_PASSWORD:?AUTH_DB_PASSWORD es obligatorio}"

# Las contraseñas se interpolan en literales T-SQL (sqlcmd -v): se restringe el
# alfabeto para que un carácter como ' nunca pueda romper ni inyectar la sentencia.
for var in INSUMOS_DB_PASSWORD AUTH_DB_PASSWORD; do
  if [[ ! "${!var}" =~ ^[A-Za-z0-9_!@#%^*.+=-]{16,128}$ ]]; then
    echo "[db-init] ERROR: ${var} debe tener 16-128 caracteres de [A-Za-z0-9_!@#%^*.+=-]" >&2
    exit 1
  fi
done

DB_HOST="${DB_HOST:-sqlserver}"
DB_PORT="${DB_PORT:-1433}"
SEED_DEMO_DATA="${SEED_DEMO_DATA:-true}"
SCRIPTS_DIR="${SCRIPTS_DIR:-/scripts/init}"
SQLCMD="${SQLCMD:-/opt/mssql-tools18/bin/sqlcmd}"

# -C: confía en el certificado autofirmado del contenedor (solo red interna de dev).
# -I: QUOTED_IDENTIFIER ON (requerido por la vista indexada y los SP).
# -b: aborta ante el primer error.
# La contraseña viaja por SQLCMDPASSWORD (no aparece en `ps`).
export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"
run_sql() {
  "$SQLCMD" -S "tcp:${DB_HOST},${DB_PORT}" -U sa -C -I -b -l 30 "$@"
}

echo "[db-init] Esperando a SQL Server en ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 60); do
  if run_sql -Q "SELECT 1" >/dev/null 2>&1; then
    echo "[db-init] SQL Server disponible."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[db-init] ERROR: SQL Server no respondió a tiempo." >&2
    exit 1
  fi
  sleep 2
done

for file in "$SCRIPTS_DIR"/*.sql; do
  name="$(basename "$file")"
  if [ "$name" = "06_seed.sql" ] && [ "$SEED_DEMO_DATA" != "true" ]; then
    echo "[db-init] Omitiendo ${name} (SEED_DEMO_DATA=${SEED_DEMO_DATA})"
    continue
  fi
  echo "[db-init] Ejecutando ${name}..."
  run_sql -i "$file" \
    -v INSUMOS_DB_PASSWORD="$INSUMOS_DB_PASSWORD" \
    -v AUTH_DB_PASSWORD="$AUTH_DB_PASSWORD"
done

echo "[db-init] Base de datos lista."
