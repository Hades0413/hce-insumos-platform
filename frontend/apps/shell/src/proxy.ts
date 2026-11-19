import { createAuthProxy } from '@hce/config';

export const proxy = createAuthProxy({ publicPaths: ['/login'] });

export const config = {
  matcher: [
    {
      // Las rutas de las zonas las atiende (y protege) cada microfront.
      source: '/((?!_next/static|_next/image|favicon.ico|icon.svg|compras|ventas|kardex).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
