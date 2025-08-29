import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface CleanupRequest {
  instanceName: string
  reason: 'abandoned_qr_scan' | 'timeout' | 'manual'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params
    console.log('🧹 [API] Iniciando cleanup de instância WhatsApp para tenant:', tenantId)

    // Validar autenticação
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    
    if (!authorization?.startsWith('Bearer ')) {
      console.error('❌ [API] Token de autorização ausente no cleanup')
      return NextResponse.json(
        { error: 'Token de autorização necessário' }, 
        { status: 401 }
      )
    }

    // Parse do body da requisição
    let cleanupData: CleanupRequest
    try {
      cleanupData = await request.json()
    } catch (parseError) {
      console.error('❌ [API] Erro ao fazer parse do body do cleanup:', parseError)
      return NextResponse.json(
        { error: 'Dados de cleanup inválidos' }, 
        { status: 400 }
      )
    }

    const { instanceName, reason } = cleanupData

    if (!instanceName) {
      console.error('❌ [API] Nome da instância não fornecido para cleanup')
      return NextResponse.json(
        { error: 'Nome da instância é obrigatório' }, 
        { status: 400 }
      )
    }

    console.log('🧹 [API] Executando cleanup:', {
      tenantId,
      instanceName,
      reason,
      timestamp: new Date().toISOString()
    })

    // Buscar configuração da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('❌ [API] Configuração da Evolution API ausente para cleanup')
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' }, 
        { status: 500 }
      )
    }

    // Fazer cleanup na Evolution API
    try {
      console.log('🔗 [API] Chamando Evolution API para cleanup:', `${evolutionApiUrl}/instance/delete/${instanceName}`)

      const evolutionResponse = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
        // Timeout mais curto para cleanup (não deve demorar)
        signal: AbortSignal.timeout(10000) // 10 segundos
      })

      console.log('📡 [API] Resposta da Evolution API para cleanup:', {
        status: evolutionResponse.status,
        statusText: evolutionResponse.statusText,
        ok: evolutionResponse.ok
      })

      // Considerar sucesso mesmo se a instância já foi deletada (404)
      if (evolutionResponse.ok || evolutionResponse.status === 404) {
        console.log('✅ [API] Cleanup da instância completado com sucesso:', instanceName)
        
        return NextResponse.json({
          success: true,
          message: 'Instância limpa com sucesso',
          instanceName,
          reason,
          timestamp: new Date().toISOString()
        })
      } else {
        // Log do erro mas não falhar completamente
        const errorText = await evolutionResponse.text().catch(() => 'Erro desconhecido')
        console.warn('⚠️ [API] Evolution API retornou erro durante cleanup:', {
          status: evolutionResponse.status,
          error: errorText
        })
        
        // Mesmo com erro na Evolution API, consideramos sucesso para evitar retry loops
        return NextResponse.json({
          success: true,
          message: 'Cleanup concluído (instância pode já ter sido removida)',
          instanceName,
          reason,
          warning: `Evolution API status: ${evolutionResponse.status}`,
          timestamp: new Date().toISOString()
        })
      }
    } catch (evolutionError: any) {
      console.error('❌ [API] Erro ao comunicar com Evolution API durante cleanup:', {
        error: evolutionError.message,
        instanceName,
        reason
      })

      // Mesmo com erro de rede, não falhar o cleanup para evitar retry loops
      return NextResponse.json({
        success: true,
        message: 'Cleanup solicitado (erro de comunicação com Evolution API)',
        instanceName,
        reason,
        error: evolutionError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error: any) {
    console.error('❌ [API] Erro geral durante cleanup:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno durante cleanup',
        details: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Permitir OPTIONS para CORS (se necessário)
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
