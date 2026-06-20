import type { NextConfig } from 'next';
import path from 'node:path';

const repositoryRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repositoryRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: repositoryRoot,
  },
  transpilePackages: ['@buzzytrip/contracts'],
};

export default nextConfig;
