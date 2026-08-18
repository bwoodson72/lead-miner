import type { NextConfig } from "next";

const apiUrl =
  process.env.LEAD_MINER_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    LEAD_MINER_API_URL: apiUrl,
    NEXT_PUBLIC_API_URL: apiUrl,
  },
};

export default nextConfig;
