import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSubscriptionInfo } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  console.log('🔍 [API /subscription/info] Iniciando requisição...')
  
  try {
    // Log dos headers para debug
    console.log('📋 Headers recebidos:', Object.fromEntries(request.headers.entries()))
    
    // Tentar obter e verificar o token
    let authUser
    try {
      authUser = verifyToken(request)
      console.log('✅ [API /subscription/info] Token verificado com sucesso para tenant:', authUser.tenantId)
    } catch (authError) {
      console.error('❌ [API /subscription/info] Erro na verificação do token:', authError)
      return NextResponse.json(
        { error: 'Token inválido ou não fornecido', details: authError instanceof Error ? authError.message : 'Erro desconhecido' },
        { status: 401 }
      )
    }
    
    if (!authUser.tenantId) {
      console.error('❌ [API /subscription/info] tenantId não encontrado no token')
      return NextResponse.json(
        { error: 'tenantId não encontrado no token de autenticação' },
        { status: 401 }
      )
    }

    console.log('📊 [API /subscription/info] Buscando informações de assinatura para tenant:', authUser.tenantId)
    
    // Buscar informações da assinatura
    const subscriptionInfo = await getSubscriptionInfo(authUser.tenantId)
    
    console.log('✅ [API /subscription/info] Informações encontradas:', JSON.stringify(subscriptionInfo, null, 2))
    
    return NextResponse.json(subscriptionInfo)
    
  } catch (error) {
    console.error('❌ [API /subscription/info] Erro interno:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available')
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
