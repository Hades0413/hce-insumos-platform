import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Providers, ZoneLayout } from '@hce/features';
import { fontVariables } from '@hce/ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Ventas · HCE Insumos', template: '%s · HCE Insumos' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06352a',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  return (
    <html lang="es" className={fontVariables}>
      <body>
        <Providers>
          <ZoneLayout zone="ventas">{children}</ZoneLayout>
        </Providers>
      </body>
    </html>
  );
}
