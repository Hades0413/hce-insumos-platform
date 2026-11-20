'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../cn';
import { Spinner } from '../primitives/Spinner';
import { Avatar } from './Avatar';

export interface UserMenuProps {
  nombre: string;
  rolLabel: string;
  email: string;
  sessionExpiresAt?: string;
  onLogout: () => void;
  loggingOut: boolean;
}

const HORA = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Lima',
});

export function UserMenu({ nombre, rolLabel, email, sessionExpiresAt, onLogout, loggingOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const vence = sessionExpiresAt ? HORA.format(new Date(sessionExpiresAt)) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Menú de ${nombre}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-12 items-center gap-3 rounded-md pl-1.5 pr-2 transition-colors hover:bg-canvas active:scale-[0.98] motion-reduce:active:scale-100',
          open && 'bg-canvas',
        )}
      >
        <Avatar name={nombre} seed={email} />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-[0.9375rem] font-semibold text-ink">{nombre}</span>
          <span className="block text-sm text-muted">{rolLabel}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn('hidden h-4 w-4 text-muted transition-transform duration-200 lg:block', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Cuenta"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-2 w-72 origin-top-right rounded-lg border border-line-strong bg-surface p-1.5 shadow-[var(--shadow-overlay)] motion-safe:animate-menu-in"
        >
          <div className="px-3 pb-3 pt-2.5" role="none">
            <p className="font-semibold text-ink">{nombre}</p>
            <p className="text-sm text-muted">{rolLabel}</p>
            <p className="mt-1 truncate text-sm text-muted">{email}</p>
            {vence && (
              <p className="mt-2.5 flex items-center gap-2 text-sm text-ink">
                <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
                Sesión activa · vence {vence}
              </p>
            )}
          </div>
          <div className="border-t border-line pt-1.5" role="none">
            <button
              type="button"
              role="menuitem"
              aria-disabled={loggingOut || undefined}
              onClick={() => !loggingOut && onLogout()}
              className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left font-semibold text-danger hover:bg-danger-bg focus-visible:bg-danger-bg"
            >
              {loggingOut ? (
                <Spinner size="sm" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h10" />
                </svg>
              )}
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
