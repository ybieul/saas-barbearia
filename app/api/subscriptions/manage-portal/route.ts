import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Interface para a resposta da Kirvano API
interface KirvanoPortalResponse {
  url: string
  expires_at?: string
}

// POST - Criar sessão do portal do cliente da Kirvano
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [Portal API] Iniciando criação de sessão do portal...')
    
    // 1. Autenticação - Verificar token JWT
    let user
    try {
      user = verifyToken(request)
      console.log('✅ [Portal API] Token validado com sucesso')
      console.log('🎯 [Portal API] TenantId:', user.tenantId)
      console.log('📧 [Portal API] Email:', user.email)
    } catch (authError: any) {
      console.error('❌ [Portal API] Erro de autenticação:', authError.message)
      return NextResponse.json(
        { 
          error: 'Não autorizado',
          details: 'Token inválido ou não fornecido'
        },
        { status: 401 }
      )
    }

    // 2. Buscar dados do tenant com kirvanoCustomerId
    console.log('🔍 [Portal API] Buscando dados do tenant...')
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { 
        id: true,
        email: true,
        name: true,
        kirvanoCustomerId: true,
        businessPlan: true,
        isActive: true
      }
    })

    if (!tenant) {
      console.error('❌ [Portal API] Tenant não encontrado:', user.tenantId)
      return NextResponse.json(
        { 
          error: 'Tenant não encontrado',
          details: 'Seu usuário não foi encontrado no sistema'
        },
        { status: 404 }
      )
    }

    console.log('✅ [Portal API] Tenant encontrado:', {
      id: tenant.id,
      email: tenant.email,
      plan: tenant.businessPlan,
      active: tenant.isActive,
      hasKirvanoId: !!tenant.kirvanoCustomerId
    })

    // 3. Verificar se possui kirvanoCustomerId
    if (!tenant.kirvanoCustomerId) {
      console.error('❌ [Portal API] Cliente sem ID da Kirvano:', tenant.email)
      return NextResponse.json(
        { 
          error: 'Cliente não encontrado na plataforma de pagamento',
          details: 'Sua conta não está vinculada ao sistema de pagamentos. Entre em contato com o suporte.'
        },
        { status: 404 }
      )
    }

    // 4. Preparar dados para chamada da API da Kirvano
    const kirvanoApiToken = process.env.KIRVANO_API_SECRET
    const kirvanoApiUrl = process.env.KIRVANO_API_URL || 'https://api.kirvano.com'
    
    if (!kirvanoApiToken) {
      console.error('❌ [Portal API] KIRVANO_API_SECRET não configurado')
      return NextResponse.json(
        { 
          error: 'Configuração inválida',
          details: 'Sistema de pagamentos não configurado'
        },
        { status: 500 }
      )
    }

    // 5. Chamar API da Kirvano para criar sessão do portal
    console.log('🌐 [Portal API] Chamando API da Kirvano...')
    console.log('🔗 [Portal API] URL da API:', `${kirvanoApiUrl}/v1/billing/portal/sessions`)
    console.log('👤 [Portal API] Customer ID:', tenant.kirvanoCustomerId)

    const kirvanoResponse = await fetch(`${kirvanoApiUrl}/v1/billing/portal/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kirvanoApiToken}`,
        'User-Agent': 'SaaS-Barbearia/1.0'
      },
      body: JSON.stringify({
        customer: tenant.kirvanoCustomerId,
        return_url: `${process.env.NEXTAUTH_URL || 'https://app.tymerbook.com'}/dashboard/assinatura`
      })
    })

    console.log('📡 [Portal API] Status da resposta da Kirvano:', kirvanoResponse.status)

    // Verificar se a chamada foi bem-sucedida
    if (!kirvanoResponse.ok) {
      const errorText = await kirvanoResponse.text()
      console.error('❌ [Portal API] Erro da API Kirvano:', {
        status: kirvanoResponse.status,
        statusText: kirvanoResponse.statusText,
        body: errorText
      })

      // Determinar tipo de erro
      if (kirvanoResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Erro de autenticação com a plataforma de pagamento',
            details: 'Chave de API inválida'
          },
          { status: 500 }
        )
      }

      if (kirvanoResponse.status === 404) {
        return NextResponse.json(
          { 
            error: 'Cliente não encontrado na plataforma de pagamento',
            details: 'Seu ID de cliente não foi encontrado no sistema de pagamentos'
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Erro ao gerar link do portal',
          details: 'Erro temporário na comunicação com a plataforma de pagamento'
        },
        { status: 500 }
      )
    }

    // 6. Processar resposta da Kirvano
    const kirvanoData: KirvanoPortalResponse = await kirvanoResponse.json()
    console.log('✅ [Portal API] Sessão criada com sucesso')
    console.log('🔗 [Portal API] Portal URL gerada:', kirvanoData.url ? '✅ Sim' : '❌ Não')

    // 7. Validar se recebemos uma URL válida
    if (!kirvanoData.url) {
      console.error('❌ [Portal API] Resposta inválida da Kirvano - URL não encontrada')
      return NextResponse.json(
        { 
          error: 'Resposta inválida da plataforma de pagamento',
          details: 'URL do portal não foi gerada'
        },
        { status: 500 }
      )
    }

    // 8. Log de sucesso e retorno
    console.log('🎉 [Portal API] Portal do cliente criado com sucesso para:', tenant.email)
    console.log('⏰ [Portal API] Timestamp:', new Date().toISOString())

    // 9. Retornar URL do portal para o frontend
    return NextResponse.json({
      success: true,
      portalUrl: kirvanoData.url,
      expiresAt: kirvanoData.expires_at,
      message: 'Link do portal gerado com sucesso'
    })

  } catch (error: any) {
    console.error('💥 [Portal API] Erro interno:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Entre em contato com o suporte'
      },
      { status: 500 }
    )
  }
}

// GET - Status da API (para debug)
export async function GET() {
  return NextResponse.json({
    message: 'Kirvano Portal Management API',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasApiToken: !!process.env.KIRVANO_API_SECRET,
    apiUrl: process.env.KIRVANO_API_URL || 'https://api.kirvano.com'
  })
}
