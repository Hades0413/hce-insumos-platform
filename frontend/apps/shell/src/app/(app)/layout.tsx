'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShellContainer } from '@hce/features';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AppShellContainer zone={pathname.startsWith('/seguridad') ? 'seguridad' : 'inicio'}>{children}</AppShellContainer>
  );
}
