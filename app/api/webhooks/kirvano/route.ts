import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Tipos para os eventos da Kirvano
interface KirvanoWebhookEvent {
  event: string // 'assinatura.ativa' | 'assinatura.cancelada' | 'assinatura.expirada' | 'assinatura.atrasada' | 'compra.aprovada'
  data: {
    customer_id: string
    customer_email: string
    customer_name?: string
    subscription_id?: string
    plan_name?: string
    plan_id?: string
    expires_at?: string
    created_at?: string
    updated_at?: string
    status?: string
    payment_status?: string
  }
}

// Mapeamento de planos da Kirvano para nosso sistema
const PLAN_MAPPING: { [key: string]: string } = {
  'basico': 'BASIC',
  'premium': 'PREMIUM',
  'free': 'FREE',
  'gratuito': 'FREE'
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validação de Segurança - Verificar token do webhook
    const kirvanoToken = request.headers.get('Kirvano-Token') || request.headers.get('kirvano-token')
    const webhookSecret = process.env.KIRVANO_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('❌ KIRVANO_WEBHOOK_SECRET não configurado')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }
    
    if (!kirvanoToken || kirvanoToken !== webhookSecret) {
      console.error('❌ Token inválido no webhook da Kirvano:', kirvanoToken)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook token' },
        { status: 401 }
      )
    }

    // 2. Ler e validar o corpo da requisição
    let webhookData: KirvanoWebhookEvent
    try {
      webhookData = await request.json()
    } catch (error) {
      console.error('❌ Erro ao parsear JSON do webhook:', error)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { event, data } = webhookData

    if (!event || !data) {
      console.error('❌ Webhook inválido - faltam campos obrigatórios:', webhookData)
      return NextResponse.json(
        { error: 'Missing required fields: event or data' },
        { status: 400 }
      )
    }

    console.log(`🔔 Webhook recebido da Kirvano - Evento: ${event}`, data)

    // 3. Buscar o tenant pelo email do cliente
    const tenant = await prisma.tenant.findUnique({
      where: {
        email: data.customer_email
      }
    })

    if (!tenant) {
      console.error('❌ Tenant não encontrado para o email:', data.customer_email)
      return NextResponse.json(
        { error: 'Tenant not found for email' },
        { status: 404 }
      )
    }

    // 4. Processar diferentes tipos de eventos
    switch (event.toLowerCase()) {
      case 'assinatura.ativa':
      case 'compra.aprovada':
        await handleSubscriptionActive(tenant.id, data)
        break

      case 'assinatura.cancelada':
      case 'assinatura.expirada':
        await handleSubscriptionCancelled(tenant.id, data)
        break

      case 'assinatura.atrasada':
        await handleSubscriptionOverdue(tenant.id, data)
        break

      default:
        console.log(`⚠️ Evento não processado: ${event}`)
        break
    }

    // 5. Sempre retornar sucesso para a Kirvano
    return NextResponse.json(
      { 
        message: 'Webhook processed successfully',
        event,
        tenant_id: tenant.id 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro interno ao processar webhook da Kirvano:', error)
    
    // Mesmo com erro interno, retornamos 200 para não ficar reprocessando
    return NextResponse.json(
      { 
        message: 'Webhook received but processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    )
  }
}

// Função para ativar assinatura
async function handleSubscriptionActive(tenantId: string, data: KirvanoWebhookEvent['data']) {
  try {
    const planName = data.plan_name?.toLowerCase() || 'basic'
    const mappedPlan = PLAN_MAPPING[planName] || 'BASIC'
    
    // Calcular data de expiração (se fornecida)
    let subscriptionEnd: Date | undefined
    if (data.expires_at) {
      subscriptionEnd = new Date(data.expires_at)
    } else {
      // Padrão: 1 mês a partir de agora
      subscriptionEnd = new Date()
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
    }

    const updateData: any = {
      isActive: true,
      businessPlan: mappedPlan,
      subscriptionEnd,
      kirvanoCustomerId: data.customer_id,
      updatedAt: new Date()
    }

    // Adicionar ID da assinatura se fornecido
    if (data.subscription_id) {
      updateData.kirvanoSubscriptionId = data.subscription_id
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData
    })

    console.log(`✅ Assinatura ativada para tenant ${tenantId} - Plano: ${mappedPlan}`)
    
  } catch (error) {
    console.error('❌ Erro ao ativar assinatura:', error)
    throw error
  }
}

// Função para cancelar/expirar assinatura
async function handleSubscriptionCancelled(tenantId: string, data: KirvanoWebhookEvent['data']) {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: false,
        businessPlan: 'FREE',
        // Manter outros dados da Kirvano para histórico
        updatedAt: new Date()
      }
    })

    console.log(`✅ Assinatura cancelada/expirada para tenant ${tenantId}`)
    
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura:', error)
    throw error
  }
}

// Função para assinatura em atraso
async function handleSubscriptionOverdue(tenantId: string, data: KirvanoWebhookEvent['data']) {
  try {
    // Política: dar período de carência de 5 dias antes de desativar
    const graceEndDate = new Date()
    graceEndDate.setDate(graceEndDate.getDate() + 5)

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        // Manter ativo durante período de carência
        isActive: true,
        subscriptionEnd: graceEndDate,
        updatedAt: new Date()
      }
    })

    console.log(`⚠️ Assinatura em atraso para tenant ${tenantId} - Carência até ${graceEndDate.toISOString()}`)
    
  } catch (error) {
    console.error('❌ Erro ao processar assinatura em atraso:', error)
    throw error
  }
}

// Método GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'Kirvano Webhook Endpoint - Ready',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
}
