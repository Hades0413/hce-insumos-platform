export const SESSION_EVENTS = Symbol('SESSION_EVENTS');

export interface SessionEventsPublisher {
  sessionRevoked(sid: string, ttlSeconds: number): void;
  permissionsChanged(userId: string): void;
}
