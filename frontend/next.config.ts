import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://askmypdf-backend-8k4o.onrender.com/api/:path*',
      },
    ];
  },
  reactStrictMode: false,
};

export default nextConfig;