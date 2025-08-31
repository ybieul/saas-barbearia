import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateSecurePassword, sendWelcomeEmail } from '@/lib/email'

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
    console.log("=== DEBUG: NOVO WEBHOOK RECEBIDO DA KIRVANO ===");

    // 1. Logar todos os cabeçalhos para descobrir o nome correto do header do token
    console.log("📋 Cabeçalhos recebidos:", JSON.stringify(Object.fromEntries(request.headers), null, 2));

    // 1. Validação de Segurança - Verificar token do webhook
    // Tenta diferentes variações de header que a Kirvano pode usar
    const kirvanoToken = request.headers.get('Kirvano-Token') || 
                        request.headers.get('kirvano-token') ||
                        request.headers.get('X-Kirvano-Token') ||
                        request.headers.get('x-kirvano-token') ||
                        request.headers.get('Authorization')?.replace('Bearer ', '')
    
    const webhookSecret = process.env.KIRVANO_WEBHOOK_SECRET
    
    console.log("🔍 --- DEBUG: VERIFICANDO TOKENS ---");
    console.log(`🔑 Token Recebido da Kirvano: [${kirvanoToken}]`);
    console.log(`🗝️  Token Esperado do .env:   [${webhookSecret}]`);
    console.log(`📏 Tamanho do token recebido: ${kirvanoToken?.length || 0}`);
    console.log(`📏 Tamanho do token esperado: ${webhookSecret?.length || 0}`);
    console.log(`🔍 Os tokens são idênticos? (sem trim): ${kirvanoToken === webhookSecret}`);
    console.log(`🧹 Os tokens são idênticos? (com trim): ${kirvanoToken?.trim() === webhookSecret?.trim()}`);
    
    if (!webhookSecret) {
      console.error('❌ KIRVANO_WEBHOOK_SECRET não configurado')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }
    
    // Validação robusta com .trim() para remover espaços em branco
    if (!kirvanoToken || !webhookSecret || kirvanoToken.trim() !== webhookSecret.trim()) {
      console.error('❌ Validação de token falhou! Acesso negado.');
      console.error('❌ Token inválido no webhook da Kirvano. Detalhes:');
      console.error(`   - Token recebido: [${kirvanoToken}]`);
      console.error(`   - Token esperado: [${webhookSecret}]`);
      console.error(`   - Headers disponíveis: ${JSON.stringify([...request.headers.keys()])}`);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook token' },
        { status: 401 }
      )
    }

    console.log("✅ Validação de token BEM-SUCEDIDA. Prosseguindo com o processamento do webhook...");

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

    // 3. Buscar ou criar o tenant baseado no evento
    let tenant = await prisma.tenant.findUnique({
      where: {
        email: data.customer_email
      }
    })

    // Se não encontrar o tenant e for um evento de ativação, criar automaticamente
    if (!tenant && (event.toLowerCase() === 'assinatura.ativa' || event.toLowerCase() === 'compra.aprovada')) {
      tenant = await handleNewUserOnboarding(data)
    } else if (!tenant) {
      console.error('❌ Tenant não encontrado para o email:', data.customer_email)
      return NextResponse.json(
        { error: 'Tenant not found for email' },
        { status: 404 }
      )
    }

    // 4. Processar diferentes tipos de eventos
    const isNewTenant = !tenant || tenant.createdAt > new Date(Date.now() - 60000) // Criado nos últimos 60 segundos
    
    switch (event.toLowerCase()) {
      case 'assinatura.ativa':
      case 'compra.aprovada':
        await handleSubscriptionActive(tenant!.id, data, isNewTenant)
        break

      case 'assinatura.cancelada':
      case 'assinatura.expirada':
        await handleSubscriptionCancelled(tenant!.id, data)
        break

      case 'assinatura.atrasada':
        await handleSubscriptionOverdue(tenant!.id, data)
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
        tenant_id: tenant!.id 
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

// Função para fazer onboarding de novos usuários automaticamente
async function handleNewUserOnboarding(data: KirvanoWebhookEvent['data']) {
  try {
    console.log(`🆕 Criando novo tenant para email: ${data.customer_email}`)
    
    // 1. Gerar senha segura
    const temporaryPassword = generateSecurePassword(12)
    
    // 2. Fazer hash da senha
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)
    
    // 3. Determinar plano
    const planName = data.plan_name?.toLowerCase() || 'basic'
    const mappedPlan = PLAN_MAPPING[planName] || 'BASIC'
    
    // 4. Calcular data de expiração
    let subscriptionEnd: Date = new Date()
    if (data.expires_at) {
      subscriptionEnd = new Date(data.expires_at)
    } else {
      // Padrão: 1 mês a partir de agora
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
    }
    
    // 5. Criar novo tenant no banco
    const tenantData = {
      name: data.customer_name || data.customer_email.split('@')[0],
      email: data.customer_email,
      password: hashedPassword,
      isActive: true,
      businessPlan: mappedPlan,
      subscriptionEnd,
      // Configurações padrão para novo negócio
      businessName: data.customer_name || 'Meu Negócio',
      businessPhone: '',
      businessAddress: '',
      businessLogo: null,
    } as any // Usar any para contornar erro de tipo temporariamente
    
    // Adicionar campos da Kirvano se disponíveis
    if (data.customer_id) {
      tenantData.kirvanoCustomerId = data.customer_id
    }
    if (data.subscription_id) {
      tenantData.kirvanoSubscriptionId = data.subscription_id
    }
    
    const newTenant = await prisma.tenant.create({
      data: tenantData
    })
    
    console.log(`✅ Novo tenant criado com ID: ${newTenant.id}`)
    
    // 6. Enviar email de boas-vindas com credenciais
    try {
      const emailSent = await sendWelcomeEmail(
        newTenant.name,
        newTenant.email,
        temporaryPassword
      )
      
      if (emailSent) {
        console.log(`✅ Email de boas-vindas enviado para: ${newTenant.email}`)
      } else {
        console.error(`❌ Falha ao enviar email de boas-vindas para: ${newTenant.email}`)
        // Não falha o processo se o email não for enviado
      }
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de boas-vindas:', emailError)
      // Continua sem falhar, pois o tenant já foi criado
    }
    
    console.log(`🎉 Onboarding automático concluído para tenant: ${newTenant.email}`)
    
    return newTenant
    
  } catch (error) {
    console.error('❌ Erro no onboarding automático:', error)
    throw error
  }
}

// Função para ativar assinatura
async function handleSubscriptionActive(tenantId: string, data: KirvanoWebhookEvent['data'], isNewTenant: boolean = false) {
  try {
    const planName = data.plan_name?.toLowerCase() || 'basic'
    const mappedPlan = PLAN_MAPPING[planName] || 'BASIC'
    
    // Para novos tenants, os dados já foram configurados na criação
    if (isNewTenant) {
      console.log(`✅ Assinatura ativada para NOVO tenant ${tenantId} - Plano: ${mappedPlan}`)
      return
    }
    
    // Para tenants existentes, atualizar os dados da assinatura
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

    console.log(`✅ Assinatura reativada/atualizada para tenant existente ${tenantId} - Plano: ${mappedPlan}`)
    
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
