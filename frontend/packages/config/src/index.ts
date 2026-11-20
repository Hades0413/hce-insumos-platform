import { NextResponse, type NextRequest } from 'next/server';

export const ACCESS_COOKIE = 'hce_at';
export const REFRESH_COOKIE = 'hce_rt';

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').origin;
  } catch {
    return '';
  }
})();

export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    isDev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' ${API_ORIGIN}${isDev ? ' ws: wss:' : ''}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(!isDev && API_ORIGIN.startsWith('https://') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export interface AuthProxyOptions {
  publicPaths?: ReadonlyArray<string>;
}

function publicOrigin(request: NextRequest): string {
  const configured = process.env.APP_PUBLIC_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_PUBLIC_URL es obligatoria en producción (origen público del shell).');
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', ''))
    .split(',')[0]!
    .trim();
  return `${proto}://${host.split(',')[0]!.trim()}`;
}

export function createAuthProxy(options: AuthProxyOptions = {}) {
  const publicPaths = options.publicPaths ?? [];
  return function proxy(request: NextRequest): NextResponse {
    const { pathname, search, basePath } = request.nextUrl;
    const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
    const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (!hasSession && !isPublic) {
      const loginUrl = new URL('/login', publicOrigin(request));
      const path = pathname === '/' && basePath ? basePath : `${basePath}${pathname}`;
      loginUrl.searchParams.set('next', `${path}${search}`);
      return NextResponse.redirect(loginUrl, 307);
    }

    const nonce = btoa(crypto.randomUUID());
    const csp = buildCsp(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };
}
