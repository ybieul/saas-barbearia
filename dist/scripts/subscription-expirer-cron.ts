#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import { getBrazilNow } from '../../lib/timezone'
import { sendSubscriptionExpiredEmail } from '../../lib/email'

const prisma = new PrismaClient()

async function expireSubscriptions() {
  const now = getBrazilNow()
  console.log(`🚀 [SUBSCRIPTION-EXPIRER] Iniciando verificação ${now.toISOString()}`)
  // Limite: assinaturas com subscriptionEnd < (now - 1 dia)
  const graceLimit = new Date(now)
  graceLimit.setDate(graceLimit.getDate() - 1)

  // Buscar tenants ainda ativos cuja data de término já passou
  const tenantsToExpire = await prisma.tenant.findMany({
    where: {
      isActive: true,
      subscriptionEnd: { lt: graceLimit }
    },
    select: { id: true, email: true, subscriptionEnd: true, businessPlan: true, name: true }
  })

  if (tenantsToExpire.length === 0) {
    console.log('✅ Nenhuma assinatura para expirar.')
    return
  }

  console.log(`⚠️ Encontradas ${tenantsToExpire.length} assinaturas vencidas a desativar.`)

  for (const t of tenantsToExpire) {
    try {
      await prisma.tenant.update({
        where: { id: t.id },
        data: { isActive: false, updatedAt: new Date() }
      })
      console.log(`⏱️ Desativada assinatura do tenant ${t.id} (${t.email}) vencida em ${t.subscriptionEnd?.toISOString()} (grace > 1 dia)`)        
      try {
        await sendSubscriptionExpiredEmail(t.name || t.email, t.email, t.businessPlan, t.subscriptionEnd || undefined)
      } catch (emailErr) {
        console.error('✉️ Falha ao enviar email de expiração para', t.email, emailErr)
      }
    } catch (e) {
      console.error(`❌ Erro ao desativar tenant ${t.id}:`, e)
    }
  }
}

expireSubscriptions().then(() => {
  console.log('🏁 Finalizado.')
  process.exit(0)
}).catch(err => {
  console.error('Erro geral:', err)
  process.exit(1)
})
