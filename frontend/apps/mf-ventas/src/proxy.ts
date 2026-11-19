import { createAuthProxy } from '@hce/config';

export const proxy = createAuthProxy();

export const config = {
  matcher: [
    // Raíz de la zona (= basePath): el patrón de abajo no la cubre.
    '/',
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
