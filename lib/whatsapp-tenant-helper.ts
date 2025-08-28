// Função helper centralizada para obter dados de instância WhatsApp do tenant
import { prisma } from '@/lib/prisma'

export interface TenantWhatsAppConfig {
  instanceName: string | null
  businessName: string
  businessPhone: string | null
}

/**
 * Busca os dados da instância WhatsApp de um tenant
 * @param tenantId - ID do tenant
 * @returns Dados da instância WhatsApp ou null se não configurada
 */
export async function getTenantWhatsAppConfig(tenantId: string): Promise<TenantWhatsAppConfig | null> {
  try {
    console.log(`🔍 [HELPER] Buscando configuração WhatsApp para tenant: ${tenantId}`)

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsapp_instance_name: true,
        businessName: true,
        businessPhone: true,
      }
    })

    if (!tenant) {
      console.error(`❌ [HELPER] Tenant não encontrado: ${tenantId}`)
      return null
    }

    console.log(`📊 [HELPER] Tenant encontrado:`, {
      businessName: tenant.businessName,
      hasInstance: !!tenant.whatsapp_instance_name
    })

    return {
      instanceName: tenant.whatsapp_instance_name,
      businessName: tenant.businessName || 'Nossa Barbearia',
      businessPhone: tenant.businessPhone,
    }
  } catch (error) {
    console.error(`❌ [HELPER] Erro ao buscar configuração WhatsApp do tenant:`, error)
    return null
  }
}

/**
 * Verifica se uma configuração de automação está ativa para um tenant
 * @param tenantId - ID do tenant
 * @param automationType - Tipo de automação ('confirmation', 'reminder_24h', etc.)
 * @returns true se a automação estiver ativa
 */
export async function isAutomationEnabled(tenantId: string, automationType: string): Promise<boolean> {
  try {
    console.log(`🔍 [HELPER] Verificando automação ${automationType} para tenant: ${tenantId}`)

    const automationSetting = await prisma.automationSetting.findFirst({
      where: {
        establishmentId: tenantId,
        automationType: automationType,
        isEnabled: true
      }
    })

    const isEnabled = !!automationSetting
    console.log(`📊 [HELPER] Automação ${automationType}: ${isEnabled ? '✅ Ativa' : '❌ Inativa'}`)

    return isEnabled
  } catch (error) {
    console.error(`❌ [HELPER] Erro ao verificar automação:`, error)
    return false
  }
}
