import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

/**
 * Shell = zona por defecto + router de Multi-Zones.
 * Cada microfront se sirve bajo su basePath desde su propia app/contenedor;
 * el shell reescribe esas rutas hacia la zona (mismo origen para el navegador:
 * cookies, CSP y CORS se mantienen simples y seguros).
 * Las URLs son de BUILD (los rewrites se compilan en el routes-manifest).
 */
const zoneUrl = (envVar: string, fallback: string): string => (process.env[envVar] ?? fallback).replace(/\/+$/, '');

const ZONES: ReadonlyArray<readonly [basePath: string, url: string]> = [
  ['/compras', zoneUrl('MF_COMPRAS_URL', 'http://localhost:3001')],
  ['/ventas', zoneUrl('MF_VENTAS_URL', 'http://localhost:3002')],
  ['/kardex', zoneUrl('MF_KARDEX_URL', 'http://localhost:3003')],
];

const nextConfig: NextConfig = createNextConfig({
  rewrites: async () =>
    ZONES.flatMap(([basePath, url]) => [
      { source: basePath, destination: `${url}${basePath}` },
      { source: `${basePath}/:path+`, destination: `${url}${basePath}/:path+` },
    ]),
});

export default nextConfig;
