'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell, SubNav, subNavClass } from '@hce/ui';

const LINKS = [
  { href: '/', label: 'Kardex' },
] as const;

/** Layout de la zona: shell común + navegación interna (soft navigation con <Link>). */
export function ZoneShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AppShell
      zone="kardex"
      subnav={
        LINKS.length > 1 ? (
          <SubNav>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={subNavClass(pathname === l.href)} aria-current={pathname === l.href ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
          </SubNav>
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
