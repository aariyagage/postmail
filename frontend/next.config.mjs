/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone" only needed for Docker deploys, not Vercel
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
