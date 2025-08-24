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
  // Configuração para produção em containers (EasyPanel) - DESABILITADO para simplificar
  // output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

export default nextConfig
