export type SessionEvent = 'login' | 'logout';

const CHANNEL = 'hce-session';

function channel(): BroadcastChannel | null {
  return typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
}

export function publishSessionEvent(event: SessionEvent): void {
  const ch = channel();
  if (!ch) return;
  ch.postMessage(event);
  ch.close();
}

export function subscribeSessionEvents(handler: (event: SessionEvent) => void): () => void {
  const ch = channel();
  if (!ch) return () => undefined;
  ch.onmessage = (e: MessageEvent<unknown>) => {
    if (e.data === 'login' || e.data === 'logout') handler(e.data);
  };
  return () => ch.close();
}
