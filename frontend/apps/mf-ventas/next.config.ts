import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

/** Zona (microfront) "ventas": app Next independiente montada bajo /ventas por el shell. */
const nextConfig: NextConfig = createNextConfig({ basePath: '/ventas' });

export default nextConfig;
