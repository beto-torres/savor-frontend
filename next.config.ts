import type { NextConfig } from "next";

const enderecoApi = process.env.API_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.219"],
  async rewrites() {
    return [
      {
        source: "/api/:caminho*",
        destination: `${enderecoApi}/api/:caminho*`,
      },
    ];
  },
};

export default nextConfig;
