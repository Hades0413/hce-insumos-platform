# 0002. Arquitectura hexagonal con límites verificados por lint

## Contexto

Las reglas del negocio (precio = costo × 1.35, IGV, stock, lotes) deben poder probarse sin base de datos ni
mensajería, y no deben depender de NestJS, SQL Server o NATS.

## Decisión

Ports & Adapters en ambos microservicios: `domain/` (entidades, VOs, agregados, puertos, un puerto por
archivo), `application/` (un caso de uso por clase, clases puras sin NestJS) e `infrastructure/` (adaptadores).
El *composition root* (`*.module.ts` + `provideUseCase`) cablea y apila decoradores
`Observed(Authorized(casoDeUso))`. Bloques comunes sin framework en `@hce/core`. Las reglas de dependencia se
verifican con ESLint (`no-restricted-imports`) en CI.

## Consecuencias

Ventajas:

- Los tests de dominio y casos de uso corren sin base de datos ni NATS, en milisegundos.
- Cambiar SQL Server o NATS solo toca adaptadores.

Desventajas:

- Hay más archivos e interfaces; se ordenan con la misma convención en los dos servicios.
