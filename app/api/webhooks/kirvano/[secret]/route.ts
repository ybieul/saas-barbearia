import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateSecurePassword, sendWelcomeEmail, sendSubscriptionCanceledEmail, sendGenericNoticeEmail } from '@/lib/email'
import { getBrazilNow } from '@/lib/timezone'

// Tipos para os eventos da Kirvano (estrutura oficial)
interface KirvanoWebhookEvent {
  event: string // 'SALE_APPROVED' | outros eventos futuros
  customer: {
    email: string
    name: string
    id?: string
  }
  plan: {
    name: string
    id?: string
    next_charge_date?: string
  }
  sale_id?: string
  subscription_id?: string
  created_at?: string
  [key: string]: any // Para outros campos que possam vir
}

// Função para mapear planos da Kirvano para nosso sistema
function mapKirvanoPlanName(kirvanoPlanName: string): string {
  const normalizedName = kirvanoPlanName.toLowerCase().trim()
  
  // Mapeamento baseado no nome exato do plano da Kirvano
  if (normalizedName.includes('ultra')) {
    return 'ULTRA'
  }
  if (normalizedName.includes('premium')) {
    return 'PREMIUM'
  }
  if (normalizedName.includes('básico') || normalizedName.includes('basico')) {
    return 'BASIC'
  }
  if (normalizedName.includes('free') || normalizedName.includes('gratuito')) {
    return 'FREE'
  }
  
  // Padrão: se não conseguir identificar, assumir BASIC
  console.warn(`⚠️ Plano não reconhecido: "${kirvanoPlanName}", usando BASIC como padrão`)
  return 'BASIC'
}

// Detecta ciclo (mensal/anual) baseado no nome do plano vindo da Kirvano
function detectPlanCycle(kirvanoPlanName: string): 'MONTHLY' | 'ANNUAL' {
  const normalizedName = kirvanoPlanName.toLowerCase()
  if (normalizedName.includes('anual') || normalizedName.includes('annual') || normalizedName.includes('12 meses')) {
    return 'ANNUAL'
  }
  return 'MONTHLY'
}

// Normaliza uma data para 23:59:59.999 (fim do dia) no fuso de São Paulo garantindo acesso até o final do dia.
function normalizeToBrazilEndOfDay(date: Date): Date {
  const clone = new Date(date)
  // Garantir correção de fuso capturando data no timezone BR (caso servidor esteja em UTC)
  const brazilRef = new Date(getBrazilNow().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }))
  // Mantemos apenas Y/M/D do parâmetro original e setamos para 23:59:59.999
  clone.setHours(23,59,59,999)
  return clone
}

export async function POST(request: NextRequest, { params }: { params: { secret: string } }) {
  const secretFromUrl = params.secret;
  const expectedSecret = process.env.KIRVANO_WEBHOOK_SECRET_PATH;

  // Validação de segurança da URL
  if (!secretFromUrl || secretFromUrl !== expectedSecret) {
    console.warn(`🚨 Tentativa de acesso ao webhook com chave secreta inválida: [${secretFromUrl}]`);
    console.warn(`🔑 Chave esperada: [${expectedSecret}]`);
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  console.log("✅ Chave secreta do webhook validada com sucesso.");
  console.log("🚀 --- NOVO WEBHOOK RECEBIDO DA KIRVANO (Validação por URL ativa) ---");

  try {
    // 1. Ler e processar o corpo da requisição
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

    console.log("📱 Webhook data recebido:", JSON.stringify(webhookData, null, 2));

    // Processar eventos da Kirvano
    switch (webhookData.event) {
      case 'SALE_APPROVED':
        await handleSaleApproved(webhookData)
        break

      case 'SUBSCRIPTION_CANCELED':
      case 'SUBSCRIPTION_EXPIRED':
        await handleSubscriptionCanceledOrExpired(webhookData)
        break

      case 'SUBSCRIPTION_RENEWED':
        await handleSubscriptionRenewed(webhookData)
        break

      // Eventos de reembolso (nomes potenciais) – ajustar se documentação oficial diferir
      case 'SALE_REFUNDED':
      case 'REFUND':
      case 'SALE_REFUND':
        await handleSubscriptionRefunded(webhookData)
        break

      default:
        console.log(`⚠️ Webhook recebido, mas o evento '${webhookData.event}' não é tratado por esta parte do código.`)
        break
    }

    // Sempre retornar sucesso para a Kirvano
    return NextResponse.json(
      { 
        message: 'Webhook recebido',
        event: webhookData.event
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

// Função principal para processar SALE_APPROVED (Find or Create)
async function handleSaleApproved(webhookData: KirvanoWebhookEvent) {
  try {
    console.log(`🔔 Processando SALE_APPROVED da Kirvano`)
    
    // 1. Extrair dados do webhook
    const customerEmail = webhookData.customer.email
    const customerName = webhookData.customer.name
    const planName = webhookData.plan.name
    const subscriptionEndDate = webhookData.plan.next_charge_date
    const kirvanoSubscriptionId = webhookData.subscription_id || webhookData.sale_id
    
    console.log(`📧 Cliente: ${customerName} (${customerEmail})`)
    console.log(`💎 Plano: ${planName}`)
    console.log(`📅 Próxima cobrança: ${subscriptionEndDate}`)
    
    // 2. Implementar lógica "Find or Create"
    let tenant = await prisma.tenant.findUnique({
      where: {
        email: customerEmail
      }
    })
    
    if (tenant) {
      // TENANT EXISTENTE: Atualizar dados da assinatura
      console.log(`👤 Tenant existente encontrado: ${tenant.id}`)
      
      // ✅ CORRIGIDO: Extrair o nome do plano DIRETAMENTE do webhook
      const planNameFromKirvano = webhookData.plan.name
  const mappedPlan = mapKirvanoPlanName(planNameFromKirvano)
  const planCycle = detectPlanCycle(planNameFromKirvano)
      
      console.log(`📝 Nome do plano da Kirvano: "${planNameFromKirvano}"`)
      console.log(`📝 Plano mapeado para o sistema: "${mappedPlan}"`)
      
      let subscriptionEnd: Date | undefined
      if (subscriptionEndDate) {
        subscriptionEnd = normalizeToBrazilEndOfDay(new Date(subscriptionEndDate))
      } else {
        subscriptionEnd = new Date()
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
        subscriptionEnd = normalizeToBrazilEndOfDay(subscriptionEnd)
      }
      
  const updateData = {
        isActive: true,
        businessPlan: mappedPlan, // ✅ USAR A VARIÁVEL AQUI
        subscriptionEnd,
        updatedAt: new Date(),
        planCycle
      }
      
  if (kirvanoSubscriptionId) (updateData as any).kirvanoSubscriptionId = kirvanoSubscriptionId
      
  await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          ...updateData,
          // webhookExpiredProcessed: false, // descomentar após prisma generate se campo existir
          lastSubscriptionEmailType: 'WELCOME'
        }
      })
      
      console.log(`✅ Assinatura atualizada para tenant existente ${tenant.id} - Plano: ${mappedPlan}`)
      
    } else {
      // TENANT NOVO: Criar com onboarding completo
      console.log(`🆕 Criando novo tenant para email: ${customerEmail}`)
      
      // 1. Gerar senha segura
      const temporaryPassword = generateSecurePassword(12)
      
      // 2. Fazer hash da senha
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12)
      
      // 3. Determinar plano - ✅ CORRIGIDO: Extrair o nome do plano DIRETAMENTE do webhook
      const planNameFromKirvano = webhookData.plan.name
  const mappedPlan = mapKirvanoPlanName(planNameFromKirvano)
  const planCycle = detectPlanCycle(planNameFromKirvano)
      
      console.log(`📝 Nome do plano da Kirvano: "${planNameFromKirvano}"`)
      console.log(`📝 Plano mapeado para o sistema: "${mappedPlan}"`)
      
      // 4. Calcular data de expiração
      let subscriptionEnd: Date = new Date()
      if (subscriptionEndDate) {
        subscriptionEnd = normalizeToBrazilEndOfDay(new Date(subscriptionEndDate))
      } else {
        // Padrão: 1 mês a partir de agora
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
        subscriptionEnd = normalizeToBrazilEndOfDay(subscriptionEnd)
      }
      
      // 5. Criar novo tenant no banco
  const tenantData = {
        name: customerName || customerEmail.split('@')[0],
        email: customerEmail,
        password: hashedPassword,
        isActive: true,
        businessPlan: mappedPlan, // ✅ USAR A VARIÁVEL AQUI
        subscriptionEnd,
        planCycle,
        // Configurações padrão para novo negócio
        businessName: customerName || 'Meu Negócio',
        businessPhone: '',
        businessAddress: '',
        businessLogo: null,
      } as any
      
      // Adicionar ID da assinatura da Kirvano se disponível
  if (kirvanoSubscriptionId) (tenantData as any).kirvanoSubscriptionId = kirvanoSubscriptionId
  if (webhookData.customer.id) (tenantData as any).kirvanoCustomerId = webhookData.customer.id
      
      const newTenant = await prisma.tenant.create({
        data: {
          ...tenantData,
          lastSubscriptionEmailType: 'WELCOME'
        }
      })
      
      console.log(`✅ Novo tenant criado com ID: ${newTenant.id}`)
      
      // 6. Enviar email de boas-vindas com credenciais
      try {
        const emailSent = await sendWelcomeEmail(
          newTenant.name,
            newTenant.email,
            temporaryPassword,
            mappedPlan,
            subscriptionEnd
          )
        
        if (emailSent) {
          console.log(`✅ Email de boas-vindas enviado para: ${newTenant.email}`)
        } else {
          console.error(`❌ Falha ao enviar email de boas-vindas para: ${newTenant.email}`)
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de boas-vindas:', emailError)
        // Continua sem falhar, pois o tenant já foi criado
      }
      
      console.log(`🎉 Onboarding automático concluído para tenant: ${newTenant.email}`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar SALE_APPROVED:', error)
    throw error
  }
}

// Função para processar SUBSCRIPTION_CANCELED e SUBSCRIPTION_EXPIRED
async function handleSubscriptionCanceledOrExpired(webhookData: KirvanoWebhookEvent) {
  try {
    const eventType = webhookData.event
    console.log(`🚫 Processando ${eventType} da Kirvano`)
    
    // 1. Extrair email do cliente
    const customerEmail = webhookData.customer.email
    console.log(`📧 Cancelando/Expirando assinatura para: ${customerEmail}`)
    
    // 2. Encontrar o tenant correspondente
    const tenant = await prisma.tenant.findUnique({
      where: {
        email: customerEmail
      }
    })
    
    if (!tenant) {
      console.error(`❌ Tenant não encontrado para email: ${customerEmail}`)
      return
    }
    
    // 3. Atualizar o tenant para desativar a assinatura
  await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isActive: false,
  updatedAt: new Date(),
  // webhookExpiredProcessed: true,
  lastSubscriptionEmailType: eventType === 'SUBSCRIPTION_EXPIRED' ? 'EXPIRED_WEBHOOK' : 'CANCELED'
      }
    })
    try {
      await sendSubscriptionCanceledEmail(tenant.name || tenant.email, tenant.email, tenant.businessPlan)
    } catch (e) {
      console.error('✉️ Erro ao enviar email de cancelamento:', e)
    }
    
    console.log(`✅ Assinatura ${eventType.toLowerCase()} para tenant ${tenant.id} - Marcado inativo (sem downgrade para FREE)`) 
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${webhookData.event}:`, error)
    throw error
  }
}

// Função para processar SUBSCRIPTION_RENEWED
async function handleSubscriptionRenewed(webhookData: KirvanoWebhookEvent) {
  try {
    console.log(`🔄 Processando SUBSCRIPTION_RENEWED da Kirvano`)
    
    // 1. Extrair dados do webhook
    const customerEmail = webhookData.customer.email
    const newExpirationDate = webhookData.plan.next_charge_date
    
    console.log(`📧 Renovando assinatura para: ${customerEmail}`)
    console.log(`📅 Nova data de expiração: ${newExpirationDate}`)
    
    // 2. Encontrar o tenant correspondente
    const tenant = await prisma.tenant.findUnique({
      where: {
        email: customerEmail
      }
    })
    
    if (!tenant) {
      console.error(`❌ Tenant não encontrado para email: ${customerEmail}`)
      return
    }
    
    // 3. Atualizar a data de expiração
    let subscriptionEnd: Date | undefined
    if (newExpirationDate) {
      subscriptionEnd = normalizeToBrazilEndOfDay(new Date(newExpirationDate))
    } else {
      subscriptionEnd = new Date()
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
      subscriptionEnd = normalizeToBrazilEndOfDay(subscriptionEnd)
    }
    
  await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isActive: true, // Garantir que está ativo
        subscriptionEnd,
  updatedAt: new Date(),
  // webhookExpiredProcessed: false,
  lastSubscriptionEmailType: 'RENEWED'
      }
    })
    
    console.log(`✅ Assinatura renovada para tenant ${tenant.id} até ${subscriptionEnd.toISOString()}`)
    
  } catch (error) {
    console.error('❌ Erro ao processar SUBSCRIPTION_RENEWED:', error)
    throw error
  }
}

// Função para processar reembolso de venda/assinatura
async function handleSubscriptionRefunded(webhookData: KirvanoWebhookEvent) {
  try {
    console.log('💸 Processando evento de reembolso (refund) da Kirvano')
    const customerEmail = webhookData.customer?.email
    if (!customerEmail) {
      console.error('❌ Webhook de reembolso sem email de cliente')
      return
    }

    const tenant = await prisma.tenant.findUnique({ where: { email: customerEmail } })
    if (!tenant) {
      console.warn(`⚠️ Tenant não encontrado para reembolso: ${customerEmail}`)
      return
    }

    const now = new Date()
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        isActive: false,
        businessPlan: 'Reembolsado', // Marca claramente o motivo
        subscriptionEnd: now,
        updatedAt: now,
        // Opcional: poderíamos marcar lastSubscriptionEmailType como 'CANCELED' para reutilizar enum existente
        lastSubscriptionEmailType: 'CANCELED'
        // webhookExpiredProcessed deixado de fora (não é expiração, é reembolso)
      }
    })

    console.log(`✅ Reembolso processado: tenant ${tenant.id} (${customerEmail}) desativado.`)

    // Enviar email de notificação de reembolso
    try {
      const portalUrl = `${process.env.NEXTAUTH_URL || 'https://tymerbook.com'}/dashboard/assinatura`
      await sendGenericNoticeEmail({
        email: tenant.email,
        name: tenant.name || tenant.email,
        plan: tenant.businessPlan,
        subject: '💸 Reembolso processado',
        title: 'Reembolso Confirmado',
        subtitle: 'Acesso desativado',
        body: `<p>Olá <strong>${tenant.name || tenant.email}</strong>,</p><p>O reembolso da sua assinatura foi processado e o acesso foi desativado.</p><p>Se desejar voltar, você pode reativar uma nova assinatura quando quiser.</p>`,
        ctaText: 'Gerenciar Assinatura',
        ctaUrl: portalUrl
      })
    } catch (emailErr) {
      console.error('✉️ Erro ao enviar email de reembolso:', emailErr)
    }
  } catch (error) {
    console.error('❌ Erro ao processar reembolso:', error)
    throw error
  }
}

// Método GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'Kirvano Webhook Endpoint - Ready (SALE_APPROVED + Lifecycle)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supported_events: [
      'SALE_APPROVED',
      'SUBSCRIPTION_CANCELED', 
      'SUBSCRIPTION_EXPIRED',
      'SUBSCRIPTION_RENEWED'
    ]
  })
}
