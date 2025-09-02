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
  // Garantir que variáveis NEXT_PUBLIC sejam injetadas corretamente no frontend
  env: {
    // Variável para número de suporte via WhatsApp
    NEXT_PUBLIC_NUMERO_PARA_SUPORTE: process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE,
    
    // Outras variáveis NEXT_PUBLIC encontradas no projeto
    NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES: process.env.NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES,
    NEXT_PUBLIC_DEBUG_AVAILABILITY_COMPARISON: process.env.NEXT_PUBLIC_DEBUG_AVAILABILITY_COMPARISON,
    
    // Adicione aqui qualquer nova variável NEXT_PUBLIC_ que criar no futuro
    // NEXT_PUBLIC_NOVA_VARIAVEL: process.env.NEXT_PUBLIC_NOVA_VARIAVEL,
  },
  // Configuração para produção em containers (EasyPanel) - DESABILITADO para simplificar
  // output: 'standalone',
  trailingSlash: false,
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
}

export default nextConfig
