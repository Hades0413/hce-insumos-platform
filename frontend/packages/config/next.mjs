// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const INTERNAL_PACKAGES = ['@hce/ui', '@hce/features', '@hce/api-client', '@hce/domain', '@hce/config'];

function isHttpsDeployment() {
  return process.env.HSTS_ENABLED === 'true' || (process.env.APP_PUBLIC_URL ?? '').startsWith('https://');
}

export function staticSecurityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ...(isHttpsDeployment()
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
  ];
}

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
