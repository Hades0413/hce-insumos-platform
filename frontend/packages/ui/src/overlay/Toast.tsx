'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { useExitAnimation } from '../hooks';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 6000;

const TONES: Record<ToastTone, string> = {
  success: 'border-l-ok',
  error: 'border-l-danger',
  info: 'border-l-brand-600',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);
  const push = useCallback((tone: ToastTone, title: string, description?: string) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-3), { id, tone, title, description }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  const render = (filter: (t: ToastItem) => boolean) =>
    items.filter(filter).map((t) => <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="Notificaciones"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        <div aria-live="assertive" className="contents">
          {render((t) => t.tone === 'error')}
        </div>
        <div aria-live="polite" className="contents">
          {render((t) => t.tone !== 'error')}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const exit = useExitAnimation(onDismiss);
  const startExit = exit.start;
  useEffect(() => {
    if (item.tone === 'error' || paused) return;
    const timer = setTimeout(startExit, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.tone, paused, startExit]);

  return (
    <div
      onAnimationEnd={exit.onAnimationEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-md border border-line border-l-4 bg-surface px-4 py-3 text-ink shadow-[var(--shadow-overlay)]',
        exit.leaving ? 'motion-safe:animate-toast-out' : 'motion-safe:animate-toast-in',
        TONES[item.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{item.title}</p>
          {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
        </div>
        <button
          type="button"
          aria-label={`Cerrar aviso: ${item.title}`}
          onClick={exit.start}
          className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
