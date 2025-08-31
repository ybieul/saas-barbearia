import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from './lib/prisma'
import { getBrazilNow } from './lib/timezone'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register', '/']
  
  // Se é uma rota pública, permitir acesso
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Para rotas do dashboard, verificar autenticação e assinatura
  if (pathname.startsWith('/dashboard')) {
    const secret = process.env.NEXTAUTH_SECRET

    // --- INÍCIO DA CORREÇÃO ---
    
    // Log para depuração. No EasyPanel, verifique os logs do serviço para ver esta saída.
    console.log("🔍 Verificando NEXTAUTH_SECRET no middleware:", secret ? "✅ Encontrada" : "❌ NÃO ENCONTRADA!")

    // Verificação de segurança: se a chave secreta não estiver configurada no servidor,
    // a autenticação é impossível e deve falhar com um erro claro.
    if (!secret) {
      console.error("💥 Erro Crítico: A variável de ambiente NEXTAUTH_SECRET não está configurada no servidor.")
      // Retorna um erro 500 para indicar uma falha de configuração do servidor
      return new Response("Erro de configuração de autenticação interna.", { status: 500 })
    }
    
    // Garante que a chave secreta seja passada para a função getToken
    const sessionToken = await getToken({ req: request, secret })
    
    // --- FIM DA CORREÇÃO ---
    
    // 1. Verificar se há token válido
    if (!sessionToken) {
      console.log("🔒 Sem token de sessão válido, redirecionando para login")
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      // 2. Obter o tenantId do token do NextAuth
      const tenantId = sessionToken.tenantId as string

      if (!tenantId) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // 3. Buscar informações da assinatura do tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { 
          isActive: true, 
          subscriptionEnd: true 
        }
      })

      if (!tenant) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // 4. Verificar se a assinatura está ativa
      const now = getBrazilNow()
      
      // Converte explicitamente o valor para um booleano. 
      // Isso funciona para: true, 1, false, 0, null, undefined.
      const isActiveAsBoolean = Boolean(tenant?.isActive)
      
      // Debug: Log para verificar conversão de TINYINT(1) -> Boolean
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 DEBUG: tenant.isActive = ${tenant.isActive} (tipo: ${typeof tenant.isActive}) → Boolean = ${isActiveAsBoolean}`)
      }
      
      const isSubscriptionActive = isActiveAsBoolean && 
        (tenant.subscriptionEnd ? tenant.subscriptionEnd > now : true)
      
      // 5. Verificar se já está na página de assinatura
      const isOnBillingPage = pathname.startsWith('/dashboard/assinatura')

      // 6. PAYWALL: Se assinatura inativa e não está na página de assinatura
      if (!isSubscriptionActive && !isOnBillingPage) {
        console.log(`🔒 PAYWALL: Redirecionando usuário ${tenantId} para /dashboard/assinatura`)
        return NextResponse.redirect(new URL('/dashboard/assinatura', request.url))
      }

    } catch (error) {
      console.error('Erro no middleware de verificação:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all dashboard routes specifically for paywall protection
     * Exclude API routes, static files, and public assets
     */
    '/dashboard/:path*',
  ],
}
