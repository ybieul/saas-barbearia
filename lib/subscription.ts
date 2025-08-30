import { prisma } from './prisma'
import { getBrazilNow } from './timezone'

export interface SubscriptionInfo {
  isActive: boolean
  plan: string
  isExpired: boolean
  daysUntilExpiry?: number
  canAccessFeature: (feature: string) => boolean
}

// Recursos por plano
const PLAN_FEATURES = {
  FREE: {
    maxClients: 10,
    maxAppointments: 50,
    maxServices: 3,
    maxProfessionals: 1,
    whatsappIntegration: false,
    customReports: false,
    apiAccess: false
  },
  BASIC: {
    maxClients: 100,
    maxAppointments: 500,
    maxServices: 10,
    maxProfessionals: 3,
    whatsappIntegration: true,
    customReports: false,
    apiAccess: false
  },
  PREMIUM: {
    maxClients: -1, // Ilimitado
    maxAppointments: -1, // Ilimitado
    maxServices: -1, // Ilimitado
    maxProfessionals: -1, // Ilimitado
    whatsappIntegration: true,
    customReports: true,
    apiAccess: true
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

    // Se expirou, forçar plano FREE
    const effectivePlan = (isExpired || !tenant.isActive) ? 'FREE' : tenant.businessPlan
    const planFeatures = PLAN_FEATURES[effectivePlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.FREE

    return {
      isActive: tenant.isActive && !isExpired,
      plan: effectivePlan,
      isExpired,
      daysUntilExpiry: daysUntilExpiry || undefined,
      canAccessFeature: (feature: string) => {
        return planFeatures[feature as keyof typeof planFeatures] === true
      }
    }
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error)
    // Em caso de erro, retornar plano FREE por segurança
    return {
      isActive: false,
      plan: 'FREE',
      isExpired: true,
      canAccessFeature: () => false
    }
  }
}

export async function checkPlanLimit(tenantId: string, resource: string): Promise<{ allowed: boolean, current: number, limit: number }> {
  try {
    const subscriptionInfo = await getSubscriptionInfo(tenantId)
    const planFeatures = PLAN_FEATURES[subscriptionInfo.plan as keyof typeof PLAN_FEATURES]
    
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
        current = await prisma.professional.count({ where: { tenantId } })
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
