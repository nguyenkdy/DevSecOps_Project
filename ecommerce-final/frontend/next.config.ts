import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // CloudFront CDN domain và LocalStack endpoint cho ảnh sản phẩm
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'http', hostname: 'localhost', port: '4566' },
    ],
  },
  // Tắt strict mode để tránh double-render trong dev
  reactStrictMode: false,
};

export default nextConfig;
