#!/usr/bin/env node
'use strict';
const { PrismaClient } = require('@prisma/client');
const { getBrazilNow } = require('../lib/timezone');
const { sendSubscriptionExpiredEmail } = require('../lib/email');
const prisma = new PrismaClient();

async function runExpireCron() {
  const now = getBrazilNow();
  console.log(`🚀 [SUBSCRIPTION-EXPIRER] Iniciando verificação ${now.toISOString()}`);
  const graceLimit = new Date(now);
  graceLimit.setDate(graceLimit.getDate() - 1);

  const tenantsToExpire = await prisma.tenant.findMany({
    where: { isActive: true, subscriptionEnd: { lt: graceLimit } },
    select: { id: true, email: true, subscriptionEnd: true, businessPlan: true, name: true, webhookExpiredProcessed: true, lastSubscriptionEmailType: true }
  });

  if (tenantsToExpire.length === 0) {
    console.log('✅ Nenhuma assinatura para expirar.');
    return;
  }

  console.log(`⚠️ Encontradas ${tenantsToExpire.length} assinaturas vencidas a desativar.`);

  for (const t of tenantsToExpire) {
    try {
      const lastType = t.lastSubscriptionEmailType;
      const webhookProcessed = t.webhookExpiredProcessed;
      if (process.env.NODE_ENV === 'development') {
        console.log('[EXPIRER] Avaliando', t.email, 'subEnd=', t.subscriptionEnd?.toISOString(), 'lastEmailType=', lastType, 'webhookProcessed=', webhookProcessed);
      }
      if (webhookProcessed && (lastType === 'EXPIRED_WEBHOOK' || lastType === 'CANCELED')) {
        console.log(`↩️ Pulando tenant ${t.email} (expiração já processada via webhook)`);
        continue;
      }
      await prisma.tenant.update({
        where: { id: t.id },
        data: { isActive: false, updatedAt: new Date(), lastSubscriptionEmailType: 'EXPIRED_GRACE', webhookExpiredProcessed: true }
      });
      console.log(`⏱️ Desativada assinatura do tenant ${t.id} (${t.email}) vencida em ${t.subscriptionEnd?.toISOString()} (grace > 1 dia)`);
      if (lastType !== 'EXPIRED_WEBHOOK') {
        try {
          await sendSubscriptionExpiredEmail(t.name || t.email, t.email, t.businessPlan, t.subscriptionEnd || undefined);
        } catch (emailErr) {
          console.error('✉️ Falha ao enviar email de expiração para', t.email, emailErr);
        }
      }
    } catch (e) {
      console.error(`❌ Erro ao desativar tenant ${t.id}:`, e);
    }
  }
}

module.exports.runExpireCron = runExpireCron;

if (require.main === module) {
  runExpireCron().then(()=>{ console.log('🏁 Finalizado.'); process.exit(0); }).catch(err=>{ console.error('Erro geral:', err); process.exit(1); });
}
