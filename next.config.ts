import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Tree-shake unused icons from lucide-react
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  // Production security hardening
  productionBrowserSourceMaps: false, // Never expose source maps to client
  poweredByHeader: false, // Hide X-Powered-By header

  // Exclude server directory from Next.js compilation
  serverExternalPackages: ["prisma", "@prisma/client"],

  // Webpack config to exclude server directory
  webpack: (config) => {
    // Exclude server directory from being processed
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions?.ignored || []), "**/server/**"],
    };
    return config;
  },

  // Security headers for SSR and static pages
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
