.DEFAULT_GOAL := help
COMPOSE := docker compose
# Producción local: imágenes optimizadas. Se agrega el puerto 1433 en 127.0.0.1 para DBeaver.
PROD := $(COMPOSE) -f docker-compose.yml -f docker-compose.db-access.yml
# Desarrollo: monta el código y recompila al guardar (sin reconstruir imágenes).
DEV := $(PROD) -f docker-compose.dev.yml
URLS := @echo "Front: http://localhost:3000 | API: http://localhost:4000/api/v1 | Swagger: http://localhost:4000/api/docs"
.PHONY: help setup dev prod up stop down logs ps build scale monitoring test test-browser screenshots test-api test-backend test-frontend lint db-shell clean

help: ## Lista los comandos
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Genera .env con secretos aleatorios y claves ES256
	./scripts/setup.sh

dev: setup ## Modo desarrollo: cambios en tiempo real, sin reconstruir imágenes
	@test -d backend/node_modules || (cd backend && pnpm install --frozen-lockfile)
	@test -d frontend/node_modules || (cd frontend && pnpm install --frozen-lockfile)
	DEV_UID=$$(id -u) DEV_GID=$$(id -g) $(DEV) up -d
	$(URLS)
	@echo "La primera compilación tarda 1-2 min. Ver avance: make logs"

prod: setup ## Modo producción: construye las imágenes y levanta todo
	$(PROD) up -d --build
	$(URLS)

up: prod ## Igual que make prod

stop: ## Detiene los contenedores sin quitarlos
	$(COMPOSE) stop

down: ## Detiene los contenedores (conserva datos)
	$(COMPOSE) down

clean: ## Detiene y BORRA volúmenes (datos de SQL Server)
	$(COMPOSE) --profile monitoring down -v

logs: ## Sigue los logs de todos los servicios
	$(COMPOSE) logs -f --tail=100

ps: ## Estado de los contenedores
	$(COMPOSE) ps

build: ## Reconstruye las imágenes
	$(COMPOSE) build

scale: ## Escala inventory-service a 3 réplicas (balanceo por NATS queue group)
	$(COMPOSE) up -d --scale inventory-service=3 --no-recreate

monitoring: ## Levanta Prometheus (9090) y Grafana (3100)
	$(COMPOSE) --profile monitoring up -d

test: test-backend test-frontend ## Corre todas las pruebas

test-browser: ## Prueba de humo E2E en navegador real (falla ante errores de consola o CSP)
	cd e2e && pnpm install --frozen-lockfile=false && pnpm smoke

screenshots: ## Regenera las capturas de docs/screenshots (solo lectura, no modifica datos)
	cd e2e && pnpm install --frozen-lockfile=false && pnpm screenshots

test-api: ## Colección Postman contra el stack levantado (usa la contraseña demo de .env)
	npx --yes newman@6 run postman/hce-insumos.postman_collection.json -e postman/hce-insumos.local.postman_environment.json \
	  --env-var "password=$$(grep '^SEED_USERS_PASSWORD=' .env | cut -d= -f2-)"

test-backend: ## Lint + typecheck + unit + e2e del backend
	cd backend && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e

test-frontend: ## Typecheck + lint + tests del frontend
	cd frontend && pnpm install --frozen-lockfile && pnpm -r typecheck && pnpm -r lint && pnpm -r test

lint: ## Lint de backend y frontend
	cd backend && pnpm lint
	cd frontend && pnpm -r lint

db-shell: ## Consola sqlcmd en SQL Server (sa)
	$(COMPOSE) exec sqlserver bash -c 'SQLCMDPASSWORD="$$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -I'
