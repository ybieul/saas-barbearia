// IMPORTS AJUSTADOS para execução standalone (sem resolver alias @)
import { prisma } from '../lib/prisma'
import { getBrazilNow } from '../lib/timezone'
import { sendTrialReminderEmail, sendTrialExpiredMissYouEmail } from '../lib/email'

/**
 * Envia lembretes de trial baseado no tempo restante:
 * - Dia 13: "Faltam 2 dias" (quando restam exatamente 2 dias)
 * - Dia 15: "Último dia" (quando resta menos de 1 dia)
 * - Dia 17: "Sentimos sua falta" (2 dias após expiração)
 */
export async function runSendTrialReminders() {
  const now = getBrazilNow()
  
  console.log(`\n🔔 [${now.toISOString()}] Iniciando envio de lembretes de trial...`)

  try {
    // Buscar tenants em TRIAL que precisam receber lembretes
    const trialTenants = await prisma.tenant.findMany({
      where: {
        subscriptionStatus: 'TRIAL',
        subscriptionEnd: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionEnd: true
      }
    })

    console.log(`📊 Encontrados ${trialTenants.length} tenants em TRIAL`)

    let remindersSent = 0
    let lastDayEmails = 0
    let twoDaysEmails = 0

    for (const tenant of trialTenants) {
      if (!tenant.subscriptionEnd) continue

      const subscriptionEnd = tenant.subscriptionEnd
      const diffMs = subscriptionEnd.getTime() - now.getTime()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      // Dia 15 (último dia): quando resta menos de 1 dia mas ainda não expirou
      if (daysLeft <= 0 && diffMs > 0) {
        console.log(`⏰ Último dia de trial: ${tenant.name} (${tenant.email})`)
        try {
          await sendTrialReminderEmail(tenant.name, tenant.email, 0)
          lastDayEmails++
          remindersSent++
        } catch (error) {
          console.error(`❌ Erro ao enviar email de último dia para ${tenant.email}:`, error)
        }
      }
      // Dia 13 (faltam 2 dias): quando restam exatamente 2 dias
      else if (daysLeft === 2) {
        console.log(`⚠️ Faltam 2 dias de trial: ${tenant.name} (${tenant.email})`)
        try {
          await sendTrialReminderEmail(tenant.name, tenant.email, 2)
          twoDaysEmails++
          remindersSent++
        } catch (error) {
          console.error(`❌ Erro ao enviar email de 2 dias para ${tenant.email}:`, error)
        }
      }
    }

    // Buscar tenants INATIVOS que expiraram há exatamente 2 dias (dia 17)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const expiredTenants = await prisma.tenant.findMany({
      where: {
        subscriptionStatus: 'INACTIVE',
        businessPlan: 'TRIAL',
        subscriptionEnd: {
          gte: threeDaysAgo,
          lt: twoDaysAgo
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionEnd: true
      }
    })

    console.log(`📊 Encontrados ${expiredTenants.length} tenants expirados há ~2 dias`)

    let missYouEmails = 0

    for (const tenant of expiredTenants) {
      console.log(`💔 Sentimos sua falta: ${tenant.name} (${tenant.email})`)
      try {
        await sendTrialExpiredMissYouEmail(tenant.name, tenant.email)
        missYouEmails++
        remindersSent++
      } catch (error) {
        console.error(`❌ Erro ao enviar email "sentimos sua falta" para ${tenant.email}:`, error)
      }
    }

    console.log(`\n✅ Lembretes de trial enviados com sucesso!`)
    console.log(`📧 Total de emails enviados: ${remindersSent}`)
    console.log(`   - Faltam 2 dias: ${twoDaysEmails}`)
    console.log(`   - Último dia: ${lastDayEmails}`)
    console.log(`   - Sentimos sua falta: ${missYouEmails}`)

  } catch (error) {
    console.error('❌ Erro ao enviar lembretes de trial:', error)
    throw error
  }
}

// Permite executar diretamente: tsx scripts/send-trial-reminders.ts
if (require.main === module) {
  runSendTrialReminders()
    .then(() => {
      console.log('Script finalizado com sucesso')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script falhou:', error)
      process.exit(1)
    })
}
