'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogBehaviorOptions {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

export function useDialogBehavior({ open, panelRef, containerRef, onEscape }: DialogBehaviorOptions): void {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const container = containerRef.current;

    const background = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== container && !el.contains(container),
    );
    const previouslyInert = background.map((el) => el.inert);
    background.forEach((el) => (el.inert = true));

    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const firstNode = nodes[0]!;
      const lastNode = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      background.forEach((el, i) => (el.inert = previouslyInert[i] ?? false));
      document.body.style.overflow = overflow;
      const current = document.activeElement;
      if (!current || current === document.body || panel?.contains(current)) previouslyFocused?.focus?.();
    };
  }, [open, panelRef, containerRef]);
}
