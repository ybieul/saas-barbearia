import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    console.log('🔍 [API] Verificando variáveis de ambiente:')
    console.log('🔍 EVOLUTION_API_URL:', evolutionURL ? '✅ Definida' : '❌ Undefined')
    console.log('🔍 EVOLUTION_API_KEY:', evolutionKey ? '✅ Definida' : '❌ Undefined')
    console.log('🔍 EVOLUTION_INSTANCE_NAME:', instanceName ? '✅ Definida' : '❌ Undefined')

    if (!evolutionURL || !evolutionKey || !instanceName) {
      return NextResponse.json({
        connected: false,
        instanceName: null,
        error: 'Variáveis de ambiente não configuradas no servidor'
      })
    }

    // Verificar status da instância
    const apiUrl = `${evolutionURL}/instance/connectionState/${instanceName}`
    
    console.log(`🔍 [API] Verificando status da instância: ${instanceName}`)
    console.log(`🔍 [API] URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey,
        'Accept': 'application/json'
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    })

    console.log(`🔍 [API] Response status: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('📋 [API] Status da instância:', data)
      
      const isConnected = data.instance?.state === 'open' || data.state === 'open'
      
      return NextResponse.json({
        connected: isConnected,
        instanceName: instanceName,
        error: !isConnected ? `Status: ${data.instance?.state || data.state}` : undefined,
        rawResponse: data
      })
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      console.error('❌ [API] Erro ao verificar status:', errorData)
      
      return NextResponse.json({
        connected: false,
        instanceName: instanceName,
        error: `HTTP ${response.status}: ${errorData.message || 'Erro na API'}`
      })
    }

  } catch (error) {
    console.error('❌ [API] Erro ao conectar com Evolution API:', error)
    return NextResponse.json({
      connected: false,
      instanceName: null,
      error: error instanceof Error ? error.message : 'Erro de conexão'
    })
  }
}
