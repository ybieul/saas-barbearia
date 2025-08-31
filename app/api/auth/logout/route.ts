import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log("🚪 Processo de logout iniciado")
    
    // Criar resposta de sucesso
    const response = NextResponse.json({
      message: 'Logout realizado com sucesso'
    })

    // Limpar cookies em ambos os ambientes
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction ? '__Secure-auth-token' : 'auth_token'
    
    // Limpar cookie httpOnly
    response.cookies.set({
      name: cookieName,
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      domain: isProduction ? '.tymerbook.com' : 'localhost',
      maxAge: 0 // Expira imediatamente
    })

    console.log("✅ Logout concluído:", {
      cookieLimpo: cookieName,
      ambiente: isProduction ? 'produção' : 'desenvolvimento'
    })

    return response
  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
