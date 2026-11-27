/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  typescript: { tsconfigPath: "tsconfig.frontend.json" },

  async redirects() {
    return [
      {
        source: "/fr",
        destination: "/fr/dashboards/analytics",
        permanent: false,
      },
      {
        source: "/en",
        destination: "/en/dashboards/analytics",
        permanent: false,
      },
      {
        source: "/ar",
        destination: "/ar/dashboards/analytics",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
