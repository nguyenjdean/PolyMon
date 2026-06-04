import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'fed-charger-silver-integrated.trycloudflare.com',
    '*.trycloudflare.com' // Optional: allow any cloudflare tunnel for easier future testing
  ]
};

export default nextConfig;
