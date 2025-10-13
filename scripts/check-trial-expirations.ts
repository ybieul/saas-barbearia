import { prisma } from '@/lib/prisma'
import { getBrazilNow } from '@/lib/timezone'

export async function runCheckTrialExpirations(): Promise<void> {
  const now = getBrazilNow()
  console.log(`[check-trial-expirations] Iniciando às ${now.toISOString()}`)

  const expiredTrials = await prisma.tenant.findMany({
    where: {
      subscriptionStatus: 'TRIAL',
      subscriptionEnd: { not: null, lt: now }
    },
    select: { id: true, email: true, subscriptionEnd: true }
  })

  console.log(`[check-trial-expirations] Encontrados ${expiredTrials.length} trials expirados`)

  for (const t of expiredTrials) {
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        isActive: false,
        subscriptionStatus: 'INACTIVE'
      }
    })
    console.log(`↳ Tenant ${t.id} (${t.email}) marcado como INACTIVE (trial expirado)`) 
  }

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
