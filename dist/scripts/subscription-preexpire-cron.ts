#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client'
import { getBrazilNow } from '../lib/timezone'
import { sendSubscriptionPreExpireEmail } from '../lib/email'
import { config } from 'dotenv'
config()

const prisma = new PrismaClient()

export async function runPreExpireCron() {
  const now = getBrazilNow()
  if (process.env.NODE_ENV === 'development') {
    console.log('🕒 [PRE-EXPIRE] Iniciando execução em', now.toISOString())
  }
  // Normalizar para meia-noite Brasil (comparação por dia)
  const today = new Date(now)
  today.setHours(0,0,0,0)
  if (process.env.NODE_ENV === 'development') {
    console.log('📅 [PRE-EXPIRE] Hoje (midnight BR):', today.toISOString())
  }

  const in3 = new Date(today); in3.setDate(in3.getDate() + 3)
  const in1 = new Date(today); in1.setDate(in1.getDate() + 1)

  // Buscar assinaturas ativas com subscriptionEnd nessas datas (dia exato)
  const targets = await prisma.tenant.findMany({
    where: {
      isActive: true,
      subscriptionEnd: { not: null }
    },
    select: { id:true, name:true, email:true, subscriptionEnd:true, businessPlan:true, lastSubscriptionEmailType:true }
  })
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [PRE-EXPIRE] Tenants candidatos: ${targets.length}`)
  }

  for (const t of targets) {
    if (!t.subscriptionEnd) continue
    const end = new Date(t.subscriptionEnd)
    const endDay = new Date(end); endDay.setHours(0,0,0,0)
    const diffDays = Math.round((endDay.getTime() - today.getTime()) / 86400000)
  const lastType = t.lastSubscriptionEmailType
    if (process.env.NODE_ENV === 'development') {
      console.log(`➡️  [PRE-EXPIRE] Tenant ${t.email} expira em ${end.toISOString()} (diffDays=${diffDays}) lastEmail=${lastType}`)
    }
    if (diffDays === 3) {
      if (lastType !== 'PRE_EXPIRE_3D') {
        try {
          await sendSubscriptionPreExpireEmail(t.name || t.email, t.email, t.businessPlan, diffDays)
          await prisma.tenant.update({ where:{id:t.id}, data:{ lastSubscriptionEmailType: 'PRE_EXPIRE_3D' } })
          console.log(`📧 Pré-expiração (3d) enviada para ${t.email}`)
        } catch (e) {
          console.error('Erro ao enviar pré-expiração 3d para', t.email, e)
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`⏩ [PRE-EXPIRE] 3d já enviado anteriormente para ${t.email}`)
      }
    } else if (diffDays === 1) {
      if (lastType !== 'PRE_EXPIRE_1D') {
        try {
          await sendSubscriptionPreExpireEmail(t.name || t.email, t.email, t.businessPlan, diffDays)
          await prisma.tenant.update({ where:{id:t.id}, data:{ lastSubscriptionEmailType: 'PRE_EXPIRE_1D' } })
          console.log(`📧 Pré-expiração (1d) enviada para ${t.email}`)
        } catch (e) {
          console.error('Erro ao enviar pré-expiração 1d para', t.email, e)
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`⏩ [PRE-EXPIRE] 1d já enviado anteriormente para ${t.email}`)
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️  [PRE-EXPIRE] diffDays=${diffDays} (nenhuma ação) para ${t.email}`)
    }
  }
}

// Execução direta somente quando chamado via CLI (não quando importado pelo scheduler)
if (require.main === module) {
  runPreExpireCron()
    .then(()=>{ console.log('✅ preexpire finalizado'); process.exit(0) })
    .catch(e=>{ console.error(e); process.exit(1) })
}
