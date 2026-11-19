import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

/** Zona (microfront) "compras": app Next independiente montada bajo /compras por el shell. */
const nextConfig: NextConfig = createNextConfig({ basePath: '/compras' });

export default nextConfig;
