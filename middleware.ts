import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getBrazilNow } from '@/lib/timezone'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register', '/']
  
  // Se é uma rota pública, permitir acesso
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Para rotas do dashboard, verificar token e estado da assinatura
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')
  const { payload } = await jwtVerify(token, secret)
  const isActive = (payload as any).isActive
  const subscriptionEndIso = (payload as any).subscriptionEnd as string | undefined
  const subscriptionEndDate = subscriptionEndIso ? new Date(subscriptionEndIso) : null
  const now = getBrazilNow() // alinhado com lib/subscription
  // Se não houver subscriptionEnd, considerar expirado forçando renovação
  const notExpired = subscriptionEndDate ? subscriptionEndDate.getTime() > now.getTime() : false
  const isSubscriptionActive = !!isActive && notExpired

      const isOnBillingPage = pathname.startsWith('/dashboard/assinatura')

      if (!isSubscriptionActive && !isOnBillingPage) {
        const url = new URL('/dashboard/assinatura', request.url)
        url.searchParams.set('reason', !isActive ? 'inativa' : 'expirada')
        return NextResponse.redirect(url)
      }
    } catch (e) {
      // Token inválido => redirecionar login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
