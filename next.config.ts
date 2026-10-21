import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Forward API calls to the FastAPI backend, so the browser and the Telegram Mini App
  // only talk to this site (one HTTPS address, no CORS).
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
