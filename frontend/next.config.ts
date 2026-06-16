import type { NextConfig } from "next";

const BUCKET = process.env.S3_BUCKET_NAME;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${BUCKET}.s3.amazonaws.com`,
      },
    ],
  },
};

export default nextConfig;