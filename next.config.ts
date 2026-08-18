import type { NextConfig } from "next";

const fallbackApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://lead-gen-api-xtjm.onrender.com"
    : "http://localhost:3001";
const apiUrl =
  process.env.LEAD_MINER_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  fallbackApiUrl;

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    LEAD_MINER_API_URL: apiUrl,
    NEXT_PUBLIC_API_URL: apiUrl,
  },
};

export default nextConfig;
