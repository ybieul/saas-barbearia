// IMPORTS AJUSTADOS: usar caminhos relativos para execução fora do Next.js (cron standalone)
import { prisma } from '../lib/prisma'
import { getBrazilNow } from '../lib/timezone'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

/**
 * Desconecta e deleta uma instância WhatsApp da Evolution API
 */
async function disconnectWhatsAppInstance(instanceName: string): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('[WhatsApp] ⚠️ Evolution API não configurada, não é possível desconectar instância')
    return false
  }

  try {
    console.log(`[WhatsApp] 🔌 Desconectando instância: ${instanceName}`)
    
    // Primeiro tenta fazer logout
    try {
      const logoutResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (logoutResponse.ok) {
        console.log(`[WhatsApp] ✅ Logout realizado: ${instanceName}`)
      }
    } catch (logoutError: any) {
      console.log(`[WhatsApp] ⚠️ Logout falhou (continuando): ${logoutError.message}`)
    }

    // Depois deleta a instância
    const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (deleteResponse.ok) {
      console.log(`[WhatsApp] ✅ Instância deletada: ${instanceName}`)
      return true
    } else {
      console.error(`[WhatsApp] ❌ Erro ao deletar instância ${instanceName}: ${deleteResponse.status}`)
      return false
    }
  } catch (error: any) {
    console.error(`[WhatsApp] ❌ Erro ao desconectar instância ${instanceName}:`, error.message)
    return false
  }
}

export async function runCheckTrialExpirations(): Promise<void> {
  const now = getBrazilNow()
  console.log(`[check-trial-expirations] Iniciando às ${now.toISOString()}`)

  const expiredTrials = await prisma.tenant.findMany({
    where: {
      subscriptionStatus: 'TRIAL',
      subscriptionEnd: { not: null, lt: now }
    },
    select: { 
      id: true, 
      email: true, 
      subscriptionEnd: true,
      whatsapp_instance_name: true,
      businessName: true
    }
  })

  console.log(`[check-trial-expirations] Encontrados ${expiredTrials.length} trials expirados`)

  let whatsappDisconnected = 0

  for (const t of expiredTrials) {
    // Desconectar WhatsApp se existir instância
    if (t.whatsapp_instance_name) {
      const disconnected = await disconnectWhatsAppInstance(t.whatsapp_instance_name)
      if (disconnected) {
        whatsappDisconnected++
      }
    }

    // Marcar tenant como inativo e limpar instância WhatsApp
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        isActive: false,
        subscriptionStatus: 'INACTIVE',
        whatsapp_instance_name: null // Limpar referência no banco
      }
    })
    
    console.log(`↳ Tenant ${t.id} (${t.email}) marcado como INACTIVE (trial expirado)`) 
  }

  console.log('[check-trial-expirations] Resumo:')
  console.log(`  - Trials expirados: ${expiredTrials.length}`)
  console.log(`  - WhatsApp desconectados: ${whatsappDisconnected}`)
  console.log('[check-trial-expirations] Concluído')
}
// Execução direta opcional (CLI)
if (require.main === module) {
  runCheckTrialExpirations().catch((e) => {
    console.error('[check-trial-expirations] Erro:', e)
    process.exit(1)
  }).finally(async () => {
    await prisma.$disconnect()
  })
}
