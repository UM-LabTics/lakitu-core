import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 200,
        aggregateTimeout: 200,
      };
    }
    return config;
  },
};

export default nextConfig;
