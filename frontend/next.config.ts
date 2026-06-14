import type { NextConfig } from "next";

const BUCKET = process.env.S3_BUCKET_NAME

const nextConfig: NextConfig = {
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: `${BUCKET}.s3.amazonaws.com`,
    },
  ],
},

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