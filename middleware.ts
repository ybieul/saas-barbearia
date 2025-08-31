import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
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
    const token = request.cookies.get('auth_token')?.value
    
    // 1. Verificar se há token
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      // 2. Decodificar o token para obter o tenantId
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      const tenantId = decoded.tenantId

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
      const isSubscriptionActive = tenant.isActive && 
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
