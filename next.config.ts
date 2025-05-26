
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com', // Added this for good measure
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com', // Added this new entry
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer, dev }) => { // Added 'dev' for completeness
    // IMPORTANT: This Webpack configuration correctly handles Node.js core module issues
    // for client-side bundles when Next.js uses Webpack as its bundler.
    // If you are using `next dev --turbopack`, Turbopack (which is experimental)
    // may not respect this webpack configuration, leading to persistent errors.
    // In such cases, try running `next dev` (without --turbopack) to use Webpack.
    if (!isServer) {
      // Ensure config.resolve object exists and merge our fallbacks
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Spread existing fallbacks
        'async_hooks': false,
        'fs': false,
        'tls': false,
        'net': false,
        'http2': false,
        'dns': false,
        'node:async_hooks': false, // Handle node: prefix
        'node:fs': false,
        'node:tls': false,
        'node:net': false,
        'node:http2': false,
        'node:dns': false,
      };
    }
    return config;
  },
};

export default nextConfig;
