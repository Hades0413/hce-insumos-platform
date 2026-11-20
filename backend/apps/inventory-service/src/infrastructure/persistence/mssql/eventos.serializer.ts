import { DomainEvent } from '@hce/core';

export function serializarEventos(eventos: readonly DomainEvent[]): string | null {
  if (eventos.length === 0) return null;
  return JSON.stringify(
    eventos.map((e) => ({ type: e.type, occurredAt: e.occurredAt.toISOString(), payload: e.payload })),
  );
}
