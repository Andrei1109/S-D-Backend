import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project is backend-only; no image domains needed unless you serve
  // product images through Next.js Image. Add domains here when needed.
  images: {
    remotePatterns: [],
  },
  // Ensure server-only code is never bundled for the client
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
