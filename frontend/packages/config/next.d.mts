import type { NextConfig } from 'next';

export declare function staticSecurityHeaders(): { key: string; value: string }[];
export declare function createNextConfig(opts?: { basePath?: string; rewrites?: NextConfig['rewrites'] }): NextConfig;
