# 0007. Contratos de mensajería versionados

## Contexto

Gateway y microservicios se despliegan por separado; un cambio de payload no puede romper a quien aún
no se actualizó.

## Decisión

- Los subjects son `<contexto>.v<n>.<recurso>.<acción>` y los eventos `<contexto>.v<n>.events.<hecho>`.
- Todo mensaje viaja en un sobre tipado: `MessageEnvelope` (identidad verificada + `requestId`) o `AnonymousEnvelope` (solo `requestId`).
- Los contratos viven en `@hce/contracts` y los permisos de NATS se definen por subject exacto.

## Consecuencias

Ventajas:

- Un cambio incompatible se publica como `v2` en paralelo; la trazabilidad es de extremo a extremo.

Desventajas:

- Hay que mantener ambas versiones durante la transición.
