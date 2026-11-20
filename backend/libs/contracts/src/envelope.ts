import { Rol } from './auth';
import { Permiso } from './permissions';

export interface TraceContext {
  readonly requestId: string;
}

export interface RequestContext extends TraceContext {
  readonly userId: string;
  readonly rol: Rol;
  readonly permisos: readonly Permiso[];
}

export interface MessageEnvelope<T, C extends TraceContext = RequestContext> {
  readonly ctx: C;
  readonly data: T;
}

export type AnonymousEnvelope<T> = MessageEnvelope<T, TraceContext>;

export interface IntegrationEvent<P = unknown> {
  readonly eventId: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly payload: P;
}
