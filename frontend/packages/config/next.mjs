// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raíz del monorepo frontend (tracing de dependencias para `output: standalone`). */
const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Paquetes internos distribuidos como TypeScript fuente. */
const INTERNAL_PACKAGES = ['@hce/ui', '@hce/api-client', '@hce/domain', '@hce/config'];

/**
 * Cabeceras estáticas de seguridad (OWASP Secure Headers). La CSP se emite por
 * request desde `proxy.ts` porque lleva un nonce único.
 * @returns {{ key: string, value: string }[]}
 */
export function staticSecurityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ...(process.env.NODE_ENV === 'production'
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
  ];
}

/**
 * Configuración Next común a todas las zonas.
 * @param {{ basePath?: string, rewrites?: import('next').NextConfig['rewrites'] }} [opts]
 * @returns {import('next').NextConfig}
 */
export function createNextConfig(opts = {}) {
  return {
    basePath: opts.basePath,
    output: 'standalone',
    poweredByHeader: false,
    reactStrictMode: true,
    productionBrowserSourceMaps: false,
    transpilePackages: INTERNAL_PACKAGES,
    outputFileTracingRoot: WORKSPACE_ROOT,
    turbopack: { root: WORKSPACE_ROOT },
    typedRoutes: false,
    images: { unoptimized: true },
    async headers() {
      return [{ source: '/:path*', headers: staticSecurityHeaders() }];
    },
    ...(opts.rewrites ? { rewrites: opts.rewrites } : {}),
  };
}
