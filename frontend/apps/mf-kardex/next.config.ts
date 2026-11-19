import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

/** Zona (microfront) "kardex": app Next independiente montada bajo /kardex por el shell. */
const nextConfig: NextConfig = createNextConfig({ basePath: '/kardex' });

export default nextConfig;
