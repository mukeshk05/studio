
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
      
      // Ensure config.resolve.fallback object exists
      config.resolve.fallback = config.resolve.fallback || {};
      // Prevent 'async_hooks' from being resolved client-side by providing an empty module.
      config.resolve.fallback['async_hooks'] = false;

      // Ensure config.resolve.alias object exists
      config.resolve.alias = config.resolve.alias || {};
      // Add alias as well, for broader compatibility, though fallback is primary for Webpack
      config.resolve.alias['async_hooks'] = false;
    }
    return config;
  },
};

export default nextConfig;
