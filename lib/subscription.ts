import { prisma } from './prisma'
import { getBrazilNow } from './timezone'

export interface SubscriptionInfo {
  isActive: boolean
  plan: string
  isExpired: boolean
  daysUntilExpiry?: number
  canAccessFeature: (feature: string) => boolean
}

// Recursos por plano (sem plano FREE)
const PLAN_FEATURES = {
  BASIC: {
    maxClients: -1, // Ilimitado (não há limite especificado)
    maxAppointments: -1, // Ilimitado (não há limite especificado)
    maxServices: -1, // Ilimitado (não há limite especificado)
    maxProfessionals: 1, // Plano Básico: 1 profissional
    whatsappIntegration: true,
    customReports: true, // ✅ AGORA LIBERADO para plano básico
    apiAccess: false // ❌ Sistema privado - nenhum plano tem acesso à API
  },
  PREMIUM: {
    maxClients: -1, // Ilimitado (não há limite especificado)
    maxAppointments: -1, // Ilimitado (não há limite especificado)
    maxServices: -1, // Ilimitado (não há limite especificado)
    maxProfessionals: 3, // 🔄 AJUSTADO: Plano Premium: 3 profissionais (antes era 5)
    whatsappIntegration: true,
    customReports: true,
    apiAccess: false // ❌ Sistema privado - nenhum plano tem acesso à API
  },
  ULTRA: {
    maxClients: -1, // Ilimitado
    maxAppointments: -1, // Ilimitado
    maxServices: -1, // Ilimitado
    maxProfessionals: -1, // Plano Ultra: Ilimitado
    whatsappIntegration: true,
    customReports: true,
    apiAccess: false // ❌ Sistema privado - nenhum plano tem acesso à API
  }
}

export async function getSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        businessPlan: true,
        isActive: true,
        subscriptionEnd: true
      }
    })

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const now = getBrazilNow()
    const isExpired = tenant.subscriptionEnd ? tenant.subscriptionEnd < now : false
    const daysUntilExpiry = tenant.subscriptionEnd 
      ? Math.ceil((tenant.subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined

    // Se expirou ou não ativo, usuario não pode usar o sistema
  const isActiveSubscription = tenant.isActive && !isExpired
  // ✅ Normalizar plano para suportar variantes anuais (ex: 'BASIC Anual', 'PREMIUM Anual')
  let rawPlan = tenant.businessPlan || ''
  const lower = rawPlan.toLowerCase()
  if (lower.includes('basic')) rawPlan = 'BASIC'
  else if (lower.includes('básico')) rawPlan = 'BASIC'
  else if (lower.includes('premium')) rawPlan = 'PREMIUM'
  else if (lower.includes('ultra')) rawPlan = 'ULTRA'

  const effectivePlan = isActiveSubscription ? rawPlan : 'INACTIVE'
    
    // Só buscar features se a assinatura estiver ativa
    const planFeatures = isActiveSubscription 
      ? PLAN_FEATURES[effectivePlan as keyof typeof PLAN_FEATURES] 
      : null

    return {
      isActive: isActiveSubscription,
      plan: effectivePlan,
      isExpired,
      daysUntilExpiry: daysUntilExpiry || undefined,
      canAccessFeature: (feature: string) => {
        if (!planFeatures) return false
        return planFeatures[feature as keyof typeof planFeatures] === true
      }
    }
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error)
    // Em caso de erro, retornar assinatura inativa por segurança
    return {
      isActive: false,
      plan: 'INACTIVE',
      isExpired: true,
      canAccessFeature: () => false
    }
  }
}

export async function checkPlanLimit(tenantId: string, resource: string): Promise<{ allowed: boolean, current: number, limit: number }> {
  try {
    const subscriptionInfo = await getSubscriptionInfo(tenantId)
    
    // Se assinatura inativa, negar acesso
    if (!subscriptionInfo.isActive) {
      return { allowed: false, current: 0, limit: 0 }
    }
    
    const planFeatures = PLAN_FEATURES[subscriptionInfo.plan as keyof typeof PLAN_FEATURES]
    
    if (!planFeatures) {
      return { allowed: false, current: 0, limit: 0 }
    }
    
    let current = 0
    let limit = 0

    switch (resource) {
      case 'clients':
        current = await prisma.endUser.count({ where: { tenantId } })
        limit = planFeatures.maxClients
        break
      case 'appointments':
        current = await prisma.appointment.count({ where: { tenantId } })
        limit = planFeatures.maxAppointments
        break
      case 'services':
        current = await prisma.service.count({ where: { tenantId } })
        limit = planFeatures.maxServices
        break
      case 'professionals':
        current = await prisma.professional.count({ 
          where: { 
            tenantId,
            isActive: true  // Contar apenas profissionais ativos
          } 
        })
        limit = planFeatures.maxProfessionals
        break
      default:
        throw new Error(`Resource type '${resource}' not supported`)
    }

    // -1 significa ilimitado
    const allowed = limit === -1 || current < limit

    return { allowed, current, limit }
  } catch (error) {
    console.error('Erro ao verificar limite do plano:', error)
    return { allowed: false, current: 0, limit: 0 }
  }
}

export async function requireActiveSubscription(tenantId: string): Promise<void> {
  const subscriptionInfo = await getSubscriptionInfo(tenantId)
  
  if (!subscriptionInfo.isActive) {
    throw new Error('Subscription expired or inactive')
  }
}

export async function requirePlanFeature(tenantId: string, feature: string): Promise<void> {
  const subscriptionInfo = await getSubscriptionInfo(tenantId)
  
  if (!subscriptionInfo.canAccessFeature(feature)) {
    throw new Error(`Feature '${feature}' not available in plan '${subscriptionInfo.plan}'`)
  }
}
