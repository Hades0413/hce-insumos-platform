import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Providers } from '@hce/ui';
import { ZoneShell } from '@/components/ZoneShell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Compras · HCE Insumos', template: '%s · HCE Insumos' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a4658' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render dinámico: la CSP usa un nonce por request (ver src/proxy.ts).
  await connection();
  return (
    <html lang="es">
      <body>
        <Providers>
          <ZoneShell>{children}</ZoneShell>
        </Providers>
      </body>
    </html>
  );
}
