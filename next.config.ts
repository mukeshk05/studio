
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure config.resolve object exists
      config.resolve = config.resolve || {};
      // Ensure config.resolve.alias object exists
      config.resolve.alias = config.resolve.alias || {};
      
      // Prevent 'async_hooks' from being resolved client-side.
      // This addresses issues with libraries like OpenTelemetry's Node.js tracer.
      config.resolve.alias['async_hooks'] = false;
    }
    return config;
  },
};

export default nextConfig;
