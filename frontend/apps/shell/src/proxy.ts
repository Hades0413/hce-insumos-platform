import { createAuthProxy } from '@hce/config';

export const proxy = createAuthProxy({ publicPaths: ['/login'] });

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|(?:compras|ventas|kardex)(?:/|$)).*)',
  ],
};
