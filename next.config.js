const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: output: 'standalone' removed - not needed for Vercel and causes Windows symlink issues
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@components': path.resolve(__dirname, 'src/modules-view/components'),
      '@utils': path.resolve(__dirname, 'src/modules-view/utils'),
      '@modules-logic': path.resolve(__dirname, 'src/modules-logic'),
      '@modules-agents': path.resolve(__dirname, 'src/modules-agents'),
      '@modules-view': path.resolve(__dirname, 'src/modules-view'),
    };
    return config;
  },
}

module.exports = nextConfig

