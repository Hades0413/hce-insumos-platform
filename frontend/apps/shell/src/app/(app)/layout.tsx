'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@hce/ui';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell zone="inicio">{children}</AppShell>;
}
