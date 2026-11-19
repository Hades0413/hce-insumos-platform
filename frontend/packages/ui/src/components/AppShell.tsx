'use client';

import { useState, type ReactNode } from 'react';
import { navParaRol, ROL_LABEL, type ZoneKey } from '@hce/domain';
import { useLogout, useSession } from '@hce/api-client/react';
import { cn } from '../cn';
import { PageLoader } from './Spinner';
import { Alert } from './Feedback';

const ICONS: Record<ZoneKey, ReactNode> = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  compras: <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6.2M9 20h.01M18 20h.01" />,
  ventas: <path d="M4 7h16M4 12h16M4 17h10M17 15l2 2 3-4" />,
  kardex: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export interface SubNavItem {
  href: string;
  label: string;
  active?: boolean;
}

export interface AppShellProps {
  /** Zona activa (microfront) para resaltar en el menú. */
  zone: ZoneKey;
  /** Navegación interna de la zona (usar <Link> de next del lado de la zona). */
  subnav?: ReactNode;
  children: ReactNode;
}

/**
 * Layout común a todas las zonas. Los enlaces entre zonas son <a> (navegación dura):
 * cada microfront es una app Next independiente servida bajo el mismo origen (Multi-Zones).
 */
export function AppShell({ zone, subnav, children }: AppShellProps) {
  const { data: session, isPending, error } = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const nav = navParaRol(session?.user.rol);

  const sidebar = (
    <nav aria-label="Módulos" className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const active = item.key === zone;
        return (
          <a
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
              active ? 'bg-brand-600 text-white' : 'text-brand-50/90 hover:bg-brand-700',
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[item.key]}
            </svg>
            {item.label}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Sidebar fijo en laptop */}
      <aside className="hidden bg-brand-900 text-white lg:flex lg:flex-col">
        <Brand />
        {sidebar}
      </aside>

      {/* Drawer en tablet/móvil */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" aria-hidden="true" onClick={() => setOpen(false)} />
          <aside id="menu-movil" className="absolute inset-y-0 left-0 w-64 bg-brand-900 text-white shadow-xl">
            <Brand />
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-canvas lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="font-semibold text-brand-800 lg:hidden">HCE Insumos</span>
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-ink">{session.user.nombreCompleto}</p>
                <p className="text-xs text-muted">{ROL_LABEL[session.user.rol]}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="h-10 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:bg-canvas"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        {subnav && <div className="border-b border-line bg-surface px-4 md:px-6">{subnav}</div>}

        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
          {isPending ? (
            <PageLoader label="Verificando sesión…" />
          ) : error ? (
            <Alert title="No se pudo verificar tu sesión">
              <a className="font-semibold underline" href="/login">
                Ir a iniciar sesión
              </a>
            </Alert>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a href="/" className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-brand-800">H</span>
      <span className="font-semibold">HCE Insumos</span>
    </a>
  );
}

/** Pestañas de navegación interna de una zona (recibe los links ya renderizados). */
export function SubNav({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Secciones" className="-mb-px flex gap-1 overflow-x-auto">
      {children}
    </nav>
  );
}

export function subNavClass(active: boolean): string {
  return cn(
    'inline-flex h-12 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap',
    active ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted hover:text-ink',
  );
}
