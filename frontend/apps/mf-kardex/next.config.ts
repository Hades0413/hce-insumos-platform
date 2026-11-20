import type { NextConfig } from 'next';
import { createNextConfig } from '@hce/config/next';

const nextConfig: NextConfig = createNextConfig({ basePath: '/kardex' });

export default nextConfig;
