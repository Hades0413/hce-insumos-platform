# 0001. Microservicios detrás de un API Gateway, comunicados por NATS

## Contexto

El examen exige microservicios NestJS y un API Gateway que centralice enrutamiento y seguridad. Se
necesita escalar horizontalmente sin un balanceador adicional y aislar fallos entre identidad e inventario.

## Decisión

Tres procesos: `api-gateway` (única puerta HTTP), `auth-service` e `inventory-service`. Se comunican
por NATS en modo request/reply con *queue groups* (cada réplica de un servicio comparte la carga) y por
eventos *fan-out* para seguridad e integración. Base de datos por servicio (`HCE_Auth`, `HCE_Insumos`).

## Consecuencias

Ventajas:

- `docker compose up --scale inventory-service=3` reparte la carga sin configuración extra.
- El gateway valida el JWT localmente, sin una llamada a auth-service por request.

Desventajas:

- Más piezas que operar; se mitiga con health checks, métricas, alertas y TLS en el bus.
- No hay transacciones distribuidas; las integraciones se hacen por eventos (ADR 0006).
