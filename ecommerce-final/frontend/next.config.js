/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'http', hostname: 'localhost', port: '4566' },
    ],
  },
  reactStrictMode: false,
};

module.exports = nextConfig;
