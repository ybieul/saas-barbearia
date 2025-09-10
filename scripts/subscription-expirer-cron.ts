#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import { getBrazilNow } from '../lib/timezone'
import { sendSubscriptionExpiredEmail } from '../lib/email'

const prisma = new PrismaClient()

export async function runExpireCron() {
  const now = getBrazilNow()
  const log = (event: string, data: any = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'subscription-expirer-cron', event, ...data }))
    }
  }
  log('start', { now: now.toISOString() })
  // Limite: assinaturas com subscriptionEnd < (now - 1 dia)
  // Agora subscriptionEnd é salvo no FIM DO DIA (23:59:59.999) para garantir acesso completo.
  // Mantemos 1 dia de graça após essa data.
  const graceLimit = new Date(now)
  graceLimit.setDate(graceLimit.getDate() - 1)

  // Buscar tenants ainda ativos cuja data de término já passou
  const tenantsToExpire = await prisma.tenant.findMany({
    where: {
      isActive: true,
      subscriptionEnd: { lt: graceLimit }
    },
    select: { id: true, email: true, subscriptionEnd: true, businessPlan: true, name: true, webhookExpiredProcessed: true, lastSubscriptionEmailType: true }
  })

  if (tenantsToExpire.length === 0) {
    log('no_candidates')
    return
  }
  log('candidates_fetched', { count: tenantsToExpire.length })

  for (const t of tenantsToExpire) {
    try {
      // Log detalhado em dev
  const lastType = t.lastSubscriptionEmailType
  const webhookProcessed = t.webhookExpiredProcessed
  log('tenant_evaluated', { tenantId: t.id, email: t.email, subscriptionEnd: t.subscriptionEnd?.toISOString(), lastType, webhookProcessed })
      // Se já houve processamento de expiração via webhook e email correspondente, pular
      if (webhookProcessed && (lastType === 'EXPIRED_WEBHOOK' || lastType === 'CANCELED')) {
        log('skip_webhook_processed', { tenantId: t.id, email: t.email, lastType })
        continue
      }
      await prisma.tenant.update({
        where: { id: t.id },
        data: { isActive: false, updatedAt: new Date(), lastSubscriptionEmailType: 'EXPIRED_GRACE', webhookExpiredProcessed: true }
      })
  log('expired_deactivated', { tenantId: t.id, email: t.email, subscriptionEnd: t.subscriptionEnd?.toISOString(), lastType })        
      // Evitar reenviar email se já foi enviado por webhook como expiração
      if (lastType !== 'EXPIRED_WEBHOOK') {
        try {
          await sendSubscriptionExpiredEmail(t.name || t.email, t.email, t.businessPlan, t.subscriptionEnd || undefined)
        } catch (emailErr) {
      log('email_error_expired', { tenantId: t.id, email: t.email, error: (emailErr as Error).message })
        }
      }
    } catch (e) {
    log('error_deactivating', { tenantId: t.id, email: t.email, error: (e as Error).message })
    }
  }
}

if (require.main === module) {
  runExpireCron()
    .then(() => { console.log('🏁 Finalizado.'); process.exit(0) })
    .catch(err => { console.error('Erro geral:', err); process.exit(1) })
}
