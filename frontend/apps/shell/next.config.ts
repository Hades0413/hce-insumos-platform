import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

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
