import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the app portable and static-export-friendly: no Vercel-only APIs.
  // (Build-Plan §1 portability insurance.)
};

export default nextConfig;
