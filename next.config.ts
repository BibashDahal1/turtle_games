import type { NextConfig } from "next";

const DJANGO_URL = process.env.NEXT_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,

  // Don't let Next strip the trailing slash from /api/.../ before the rewrite.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Always send a trailing slash: every Django route here ends with "/".
        destination: `${DJANGO_URL}/api/:path*/`,
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
