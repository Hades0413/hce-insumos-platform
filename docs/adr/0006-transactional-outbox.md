# 0006. Domain Events + Transactional Outbox

## Contexto

Cada compra y venta se publica como evento en NATS (`inventory.v1.events.*`). Publicar en el bus después de confirmar en BD es un *dual write*: si el proceso cae en medio, se pierde el evento o
se publica uno de una transacción revertida.

## Decisión

- Los agregados `Compra` y `Venta` registran eventos de dominio (`AggregateRoot.record`).
- El repositorio los envía al SP (`@Eventos`), que los inserta en `dbo.OutboxEvento` en la misma transacción que el documento.
- `OutboxRelay` arrienda lotes con `READPAST`, de modo que varias réplicas no se pisan.
- Los publica como eventos de integración versionados (`inventory.v1.events.*`) y los marca como publicados. Si falla, reintenta con *backoff*.

## Consecuencias

Ventajas:

- Nunca se pierde un evento confirmado ni se publica uno revertido.

Desventajas:

- La entrega es *al menos una vez*: los consumidores deduplican por `eventId`. El retraso típico es de alrededor de 1 s.
