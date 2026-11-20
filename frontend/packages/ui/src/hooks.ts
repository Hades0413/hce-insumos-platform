'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
}

export function useAnimatedNumber(target: number, durationMs = 380): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = from + (target - from) * eased;
      setValue(t === 1 ? target : Math.round(next * 100) / 100);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return reduced || !Number.isFinite(target) ? target : value;
}

const isTypingTarget = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export function useSearchHotkey(onTrigger: () => void): void {
  const ref = useRef(onTrigger);
  useEffect(() => {
    ref.current = onTrigger;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return;
      const combo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target);
      if (combo || slash) {
        e.preventDefault();
        ref.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

export function useModifierKeyLabel(): string {
  return useSyncExternalStore(
    () => () => undefined,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'),
    () => 'Ctrl',
  );
}

export function useScrolled(threshold = 4): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('scroll', cb, { passive: true });
      return () => window.removeEventListener('scroll', cb);
    },
    () => window.scrollY > threshold,
    () => false,
  );
}

export function useExitAnimation(onDone: () => void) {
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const start = useCallback(() => (reduced ? done.current() : setLeaving(true)), [reduced]);
  const onAnimationEnd = (e: { target: EventTarget; currentTarget: EventTarget }) => {
    if (leaving && e.target === e.currentTarget) done.current();
  };
  return { leaving, start, onAnimationEnd };
}
