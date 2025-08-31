import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  console.log('🔍 [API /subscription/limits] Iniciando requisição...')
  
  try {
    // Log dos headers para debug
    console.log('📋 Headers recebidos:', Object.fromEntries(request.headers.entries()))
    
    // Tentar obter e verificar o token
    let authUser
    try {
      authUser = verifyToken(request)
      console.log('✅ [API /subscription/limits] Token verificado com sucesso para tenant:', authUser.tenantId)
    } catch (authError) {
      console.error('❌ [API /subscription/limits] Erro na verificação do token:', authError)
      return NextResponse.json(
        { error: 'Token inválido ou não fornecido', details: authError instanceof Error ? authError.message : 'Erro desconhecido' },
        { status: 401 }
      )
    }
    
    if (!authUser.tenantId) {
      console.error('❌ [API /subscription/limits] tenantId não encontrado no token')
      return NextResponse.json(
        { error: 'tenantId não encontrado no token de autenticação' },
        { status: 401 }
      )
    }

    console.log('📊 [API /subscription/limits] Buscando limites do plano para tenant:', authUser.tenantId)
    
    // Buscar limites para todos os recursos
    const [clientsLimit, appointmentsLimit, servicesLimit, professionalsLimit] = await Promise.all([
      checkPlanLimit(authUser.tenantId, 'clients'),
      checkPlanLimit(authUser.tenantId, 'appointments'), 
      checkPlanLimit(authUser.tenantId, 'services'),
      checkPlanLimit(authUser.tenantId, 'professionals')
    ])
    
    const limits = {
      clients: clientsLimit,
      appointments: appointmentsLimit,
      services: servicesLimit,
      professionals: professionalsLimit
    }
    
    console.log('✅ [API /subscription/limits] Limites encontrados:', JSON.stringify(limits, null, 2))
    
    return NextResponse.json(limits)
    
  } catch (error) {
    console.error('❌ [API /subscription/limits] Erro interno:', error)
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
