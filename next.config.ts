import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite and pg ship native/wasm assets that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: {
    // Vendors upload product photos through a server action.
    serverActions: { bodySizeLimit: "20mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/demo/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
