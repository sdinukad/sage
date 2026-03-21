/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    serverComponentsExternalPackages: ['onnxruntime-node'],
  },
};

export default nextConfig;
