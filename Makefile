.DEFAULT_GOAL := help
COMPOSE := docker compose
.PHONY: help setup up down logs ps build scale monitoring test test-backend test-frontend lint db-shell clean

help: ## Lista los comandos
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Genera .env con secretos aleatorios y claves ES256
	./scripts/setup.sh

up: setup ## Construye y levanta todo el ecosistema (BD + back + front)
	$(COMPOSE) up -d --build
	@echo "Front: http://localhost:3000 | API: http://localhost:4000/api/v1 | Swagger: http://localhost:4000/api/docs"

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

test-backend: ## Lint + typecheck + unit + e2e del backend
	cd backend && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e

test-frontend: ## Typecheck + lint + tests del frontend
	cd frontend && pnpm install --frozen-lockfile && pnpm -r typecheck && pnpm -r lint && pnpm -r test

lint: ## Lint de backend y frontend
	cd backend && pnpm lint
	cd frontend && pnpm -r lint

db-shell: ## Consola sqlcmd en SQL Server (sa)
	$(COMPOSE) exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$$MSSQL_SA_PASSWORD" -C -I'
