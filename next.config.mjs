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
  // Garantir que variáveis NEXT_PUBLIC sejam injetadas corretamente
  env: {
    NEXT_PUBLIC_NUMERO_PARA_SUPORTE: process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE,
  },
  // Configuração para produção em containers (EasyPanel) - DESABILITADO para simplificar
  // output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

export default nextConfig
