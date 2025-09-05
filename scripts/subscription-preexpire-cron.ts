#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client'
import { getBrazilNow, startOfBrazilDay, diffBrazilDays } from '../lib/timezone'

function log(event: string, data: Record<string, any> = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    service: 'subscription-preexpire-cron',
    event,
    ...data
  }))
}
import { sendSubscriptionPreExpireEmail } from '../lib/email'
import { config } from 'dotenv'
config()

const prisma = new PrismaClient()

export async function runPreExpireCron() {
  const now = getBrazilNow()
  log('start', { now: now.toISOString() })
  // Normalizar para meia-noite Brasil (comparação por dia)
  const today = startOfBrazilDay(now)
  log('today_ref', { today: today.toISOString() })


  // Buscar assinaturas ativas com subscriptionEnd nessas datas (dia exato)
  const targets = await prisma.tenant.findMany({
    where: {
      isActive: true,
      subscriptionEnd: { not: null }
    },
    select: { id:true, name:true, email:true, subscriptionEnd:true, businessPlan:true, lastSubscriptionEmailType:true }
  })
  log('candidates_fetched', { count: targets.length })

  for (const t of targets) {
    if (!t.subscriptionEnd) continue
  const end = new Date(t.subscriptionEnd)
  const diffDays = diffBrazilDays(today, end)
  const lastType = t.lastSubscriptionEmailType
  log('tenant_eval', { email: t.email, subscriptionEnd: end.toISOString(), diffDays, lastType })
    if (diffDays === 3) {
      if (lastType !== 'PRE_EXPIRE_3D') {
        try {
          await sendSubscriptionPreExpireEmail(t.name || t.email, t.email, t.businessPlan, diffDays)
          await prisma.tenant.update({ where:{id:t.id}, data:{ lastSubscriptionEmailType: 'PRE_EXPIRE_3D' } })
          log('email_sent_3d', { email: t.email })
        } catch (e) {
          log('email_error_3d', { email: t.email, error: e instanceof Error ? e.message : String(e) })
        }
      } else if (process.env.NODE_ENV === 'development') {
  log('skip_already_sent_3d', { email: t.email })
      }
    } else if (diffDays === 1) {
      if (lastType !== 'PRE_EXPIRE_1D') {
        try {
          await sendSubscriptionPreExpireEmail(t.name || t.email, t.email, t.businessPlan, diffDays)
          await prisma.tenant.update({ where:{id:t.id}, data:{ lastSubscriptionEmailType: 'PRE_EXPIRE_1D' } })
          log('email_sent_1d', { email: t.email })
        } catch (e) {
          log('email_error_1d', { email: t.email, error: e instanceof Error ? e.message : String(e) })
        }
      } else if (process.env.NODE_ENV === 'development') {
  log('skip_already_sent_1d', { email: t.email })
      }
    } else {
      log('no_action', { email: t.email, diffDays })
    }
  }
}

// Execução direta somente quando chamado via CLI (não quando importado pelo scheduler)
if (require.main === module) {
  runPreExpireCron()
    .then(()=>{ console.log('✅ preexpire finalizado'); process.exit(0) })
    .catch(e=>{ console.error(e); process.exit(1) })
}
