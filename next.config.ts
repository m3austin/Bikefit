import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the app portable and static-export-friendly: no Vercel-only APIs.
  // (Build-Plan §1 portability insurance.)

  // Rewrite barrel imports to direct paths so unused primitives/icons are not
  // pulled into the bundle (keeps landing JS under budget, PRD §8).
  experimental: {
    optimizePackageImports: ["radix-ui", "lucide-react"],
  },
};

export default nextConfig;
