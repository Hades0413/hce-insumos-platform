import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Providers } from '@hce/features';
import { fontVariables } from '@hce/ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'HCE Insumos', template: '%s · HCE Insumos' },
  description: 'Compras, dispensación y kardex de medicamentos e insumos médicos.',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
