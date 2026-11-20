'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ZoneKey } from '@hce/domain';
import { cn } from '../cn';
import { Alert } from '../primitives/Feedback';
import { PageSkeleton } from '../data/SkeletonTable';
import { useDialogBehavior } from '../overlay/useDialogBehavior';
import { useScrolled } from '../hooks';
import { UserMenu } from './UserMenu';
import { BrandLockup } from './BrandMark';

const ICONS: Record<ZoneKey, ReactNode> = {
  inicio: <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" />,
  compras: <path d="M4 8h16v12H4zM8 8V5h8v3M12 11v6M9 14h6" />,
  ventas: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h4" />,
  kardex: <path d="M5 4h14v16H5zM5 9h14M5 14h14M10 4v16" />,
  seguridad: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9.5 12l2 2 3.5-4" />,
};

export interface ShellNavItem {
  key: ZoneKey;
  label: string;
  href: string;
}

export interface ShellUser {
  nombre: string;
  rolLabel: string;
  email: string;
  sessionExpiresAt?: string;
}

export interface AppShellProps {
  nav: ReadonlyArray<ShellNavItem>;
  activeZone: ZoneKey;
  status: 'loading' | 'error' | 'ready';
  user?: ShellUser;
  onLogout?: () => void;
  loggingOut?: boolean;
  subnav?: ReactNode;
  breadcrumb?: ReadonlyArray<string>;
  siteLabel?: string;
  children: ReactNode;
}

export function AppShell({
  nav,
  activeZone,
  status,
  user,
  onLogout,
  loggingOut,
  subnav,
  breadcrumb = [],
  siteLabel,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  const links = (
    <nav aria-label="Módulos" className="flex flex-col gap-0.5 px-3 py-4">
      {nav.map((item) => {
        const active = item.key === activeZone;
        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-12 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-semibold',
              active ? 'bg-white/12 text-white' : 'text-brand-100 hover:bg-white/6 hover:text-white',
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand-200" aria-hidden="true" />}
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {ICONS[item.key]}
            </svg>
            {item.label}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <aside className="hidden bg-brand-900 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col">
          <a href="/" className="flex h-16 items-center border-b border-white/10 px-5">
            <BrandLockup inverted />
          </a>
          {links}
        </div>
      </aside>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        {links}
      </MobileMenu>

      <div className="flex min-w-0 flex-col">
        <header
          className={cn(
            'sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-surface/95 px-4 backdrop-blur-sm transition-colors duration-200 md:px-8',
            scrolled || subnav ? 'border-line' : 'border-transparent',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-canvas lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0 leading-tight">
              {siteLabel && <p className="truncate text-xs text-muted">{siteLabel}</p>}
              {breadcrumb.length > 0 && (
                <nav aria-label="Ubicación">
                  <ol className="flex min-w-0 items-center gap-1.5 text-[0.9375rem]">
                    {breadcrumb.map((item, i) => {
                      const last = i === breadcrumb.length - 1;
                      return (
                        <li key={item} className={cn('flex min-w-0 items-center gap-1.5', !last && 'hidden sm:flex')}>
                          <span
                            aria-current={last ? 'page' : undefined}
                            className={cn('truncate', last ? 'font-bold text-ink' : 'text-muted')}
                          >
                            {item}
                          </span>
                          {!last && (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4 shrink-0 text-line-strong"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              )}
            </div>
          </div>
          {user && onLogout && (
            <UserMenu
              nombre={user.nombre}
              rolLabel={user.rolLabel}
              email={user.email}
              sessionExpiresAt={user.sessionExpiresAt}
              onLogout={onLogout}
              loggingOut={loggingOut ?? false}
            />
          )}
        </header>

        {subnav && <div className="border-b border-line bg-surface px-4 md:px-8">{subnav}</div>}

        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          {status === 'loading' ? (
            <PageSkeleton label="Cargando" />
          ) : status === 'error' ? (
            <Alert title="No se pudo verificar tu sesión">
              <a className="font-semibold underline" href="/login">
                Iniciar sesión de nuevo
              </a>
            </Alert>
          ) : (
            <div className="motion-safe:animate-view-in">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior({ open, panelRef, containerRef, onEscape: onClose });
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-40 lg:hidden">
      <div
        className="absolute inset-0 bg-brand-900/40 backdrop-blur-[3px] motion-safe:animate-backdrop-in"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-900 motion-safe:animate-drawer-in"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 pl-5 pr-2">
          <BrandLockup inverted />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-11 w-11 items-center justify-center rounded-md text-brand-100 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
