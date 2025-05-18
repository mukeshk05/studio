
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
    // IMPORTANT: This Webpack configuration correctly handles Node.js core module issues
    // for client-side bundles when Next.js uses Webpack as its bundler.
    // If you are using `next dev --turbopack`, Turbopack (which is experimental)
    // may not respect this webpack configuration, leading to persistent errors.
    // In such cases, try running `next dev` (without --turbopack) to use Webpack.
    if (!isServer) {
      // Ensure config.resolve object exists
      config.resolve = config.resolve || {};
      
      // Ensure config.resolve.fallback object exists
      config.resolve.fallback = config.resolve.fallback || {};
      // Prevent Node.js core modules from being resolved client-side by providing an empty module.
      config.resolve.fallback['async_hooks'] = false;
      config.resolve.fallback['fs'] = false;
      config.resolve.fallback['tls'] = false;
      config.resolve.fallback['net'] = false;
      config.resolve.fallback['http2'] = false;
      config.resolve.fallback['dns'] = false;

      // Add fallbacks for 'node:' prefixed modules
      config.resolve.fallback['node:async_hooks'] = false;
      config.resolve.fallback['node:fs'] = false;
      config.resolve.fallback['node:tls'] = false;
      config.resolve.fallback['node:net'] = false;
      config.resolve.fallback['node:http2'] = false;
      config.resolve.fallback['node:dns'] = false;


      // Ensure config.resolve.alias object exists
      config.resolve.alias = config.resolve.alias || {};
      // Add alias as well, for broader compatibility, though fallback is primary for Webpack
      config.resolve.alias['async_hooks'] = false;
      config.resolve.alias['fs'] = false;
      config.resolve.alias['tls'] = false;
      config.resolve.alias['net'] = false;
      config.resolve.alias['http2'] = false;
      config.resolve.alias['dns'] = false;

      // Add aliases for 'node:' prefixed modules
      config.resolve.alias['node:async_hooks'] = false;
      config.resolve.alias['node:fs'] = false;
      config.resolve.alias['node:tls'] = false;
      config.resolve.alias['node:net'] = false;
      config.resolve.alias['node:http2'] = false;
      config.resolve.alias['node:dns'] = false;
    }
    return config;
  },
};

export default nextConfig;
