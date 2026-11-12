/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  async redirects() {
    return [{
      source: "/:lang",
      destination: "/:lang/dashboards/analytics",
      permanent: false,
    }]
  },
}
export default nextConfig
