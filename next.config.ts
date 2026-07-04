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

  // BikeFit-era URLs survive the SportFits move (docs/sportfit/01-Architecture
  // section 6): shipped links and the Play deep link keep working. Order
  // matters: the /fit/video special case must beat the /fit/:path* catch-all.
  async redirects() {
    return [
      { source: "/fit/video", destination: "/cycling/video", permanent: true },
      { source: "/fit", destination: "/cycling", permanent: true },
      {
        source: "/fit/:path*",
        destination: "/cycling/fit/:path*",
        permanent: true,
      },
      { source: "/adjust", destination: "/cycling/drills", permanent: true },
    ];
  },
};

export default nextConfig;
