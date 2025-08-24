/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost', 'seudominio.com'], // Adicione seu domínio aqui
  },
  // Configuração para produção em containers (EasyPanel)
  output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

export default nextConfig
