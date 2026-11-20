import { createAuthProxy } from '@hce/config';

export const proxy = createAuthProxy();

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};
