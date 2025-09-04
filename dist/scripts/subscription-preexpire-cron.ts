#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client'
import { getBrazilNow } from '../lib/timezone'
import { sendSubscriptionPreExpireEmail } from '../lib/email'

const prisma = new PrismaClient()

async function run() {
  const now = getBrazilNow()
  // Normalizar para meia-noite Brasil (comparação por dia)
  const today = new Date(now)
  today.setHours(0,0,0,0)

  const in3 = new Date(today); in3.setDate(in3.getDate() + 3)
  const in1 = new Date(today); in1.setDate(in1.getDate() + 1)

  // Buscar assinaturas ativas com subscriptionEnd nessas datas (dia exato)
  const targets = await prisma.tenant.findMany({
    where: {
      isActive: true,
      subscriptionEnd: { not: null }
    },
    select: { id:true, name:true, email:true, subscriptionEnd:true, businessPlan:true }
  })

  for (const t of targets) {
    if (!t.subscriptionEnd) continue
    const end = new Date(t.subscriptionEnd)
    const endDay = new Date(end); endDay.setHours(0,0,0,0)
    const diffDays = Math.round((endDay.getTime() - today.getTime()) / 86400000)
    if (diffDays === 3 || diffDays === 1) {
      try {
        await sendSubscriptionPreExpireEmail(t.name || t.email, t.email, t.businessPlan, diffDays)
        console.log(`📧 Pré-expiração (${diffDays}d) enviada para ${t.email}`)
      } catch (e) {
        console.error('Erro ao enviar pré-expiração para', t.email, e)
      }
    }
  }
}

run().then(()=>{ console.log('✅ preexpire finalizado'); process.exit(0) }).catch(e=>{ console.error(e); process.exit(1) })
