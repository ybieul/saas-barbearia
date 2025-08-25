import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkEvolutionApiStatus } from '@/lib/whatsapp'

// GET - Verificar status da Evolution API
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request)

    // Verificar status da Evolution API
    const status = await checkEvolutionApiStatus()

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
      environment: {
        evolutionApiUrl: process.env.EVOLUTION_API_URL || 'Not configured',
        evolutionInstance: process.env.EVOLUTION_INSTANCE_NAME || 'Not configured',
        hasApiKey: !!process.env.EVOLUTION_API_KEY
      }
    })

  } catch (error) {
    console.error('Erro ao verificar status da Evolution API:', error)
    return NextResponse.json(
      { 
        isConnected: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
