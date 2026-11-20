'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { usePermisos } from '@hce/api-client/react';
import { filtrarPorPermiso, ZONE_TABS, type ZoneKey } from '@hce/domain';
import { runViewTransition, SubNav, subNavClass } from '@hce/ui';
import { AppShellContainer } from './AppShellContainer';

const NAVIGATION_TIMEOUT_MS = 2000;

const isModifiedClick = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

export function ZoneLayout({ zone, children }: { zone: ZoneKey; children: ReactNode }) {
  const pathname = usePathname();
  const links = filtrarPorPermiso(ZONE_TABS[zone] ?? [], usePermisos() ?? []);
  const router = useRouter();
  const pendingNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    pendingNavigation.current?.();
    pendingNavigation.current = null;
  }, [pathname]);

  const navigate = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isModifiedClick(e) || href === pathname) return;
    e.preventDefault();
    void runViewTransition(
      () =>
        new Promise<void>((resolve) => {
          pendingNavigation.current = resolve;
          router.push(href);
          setTimeout(resolve, NAVIGATION_TIMEOUT_MS);
        }),
    );
  };

  const active = (ZONE_TABS[zone] ?? []).find((l) => l.href === pathname);
  const subnav =
    links.length > 1 ? (
      <SubNav>
        {links.map((l) => {
          const isActive = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={(e) => navigate(e, l.href)}
              className={subNavClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              {l.label}
            </Link>
          );
        })}
      </SubNav>
    ) : undefined;

  return (
    <AppShellContainer zone={zone} subnav={subnav} section={active?.label}>
      {children}
    </AppShellContainer>
  );
}
