import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getBrazilEndOfDay, getBrazilNow } from '@/lib/timezone'

function clampPreferredDay(day?: any): number | undefined {
  const n = Number(day)
  if (!Number.isFinite(n)) return undefined
  if (n < 1 || n > 31) return undefined
  return Math.floor(n)
}

function nextOccurrenceOfDay(base: Date, day: number): Date {
  const d = new Date(base)
  const year = d.getFullYear()
  const month = d.getMonth()
  if (d.getDate() < day) {
    return new Date(year, month, day, 0, 0, 0, 0)
  }
  return new Date(year, month + 1, day, 0, 0, 0, 0)
}

// POST /api/client-subscriptions/renew
// body: { subscriptionId, paymentMethod?: import('@prisma/client').PaymentMethod, paymentDate?: string, overridePrice?: number }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode renovar assinaturas' }, { status: 403 })
    }

    const { subscriptionId, paymentMethod, paymentDate, overridePrice } = await request.json()
    if (!subscriptionId) {
      return NextResponse.json({ message: 'subscriptionId é obrigatório' }, { status: 400 })
    }

    // Carrega assinatura com plano e cliente, validando tenant pelo plano
    const sub = await prisma.clientSubscription.findFirst({
      where: { id: subscriptionId, plan: { tenantId: user.tenantId } },
      include: { plan: true, client: true }
    })
    if (!sub) return NextResponse.json({ message: 'Assinatura não encontrada' }, { status: 404 })

    const plan = sub.plan!
    const client = sub.client!

    // preferredRenewalDay: manter o atual ou recuperar do último histórico (mesmo plano)
    let preferredRenewalDay = clampPreferredDay(sub.preferredRenewalDay)

    if (preferredRenewalDay == null) {
      try {
        const last = await prisma.clientSubscription.findFirst({
          where: { clientId: sub.clientId, planId: sub.planId },
          orderBy: { startDate: 'desc' },
          select: { preferredRenewalDay: true }
        })
        if (last?.preferredRenewalDay != null) preferredRenewalDay = last.preferredRenewalDay
      } catch {
        // ignore
      }
    }

    const now = getBrazilNow()
    // Início: se ainda vigente, começa após o término; senão, agora
    let start = now
    if (sub.endDate && now <= sub.endDate) {
      start = new Date(sub.endDate.getTime() + 1000)
    }

    // Fim: aplica ciclo e, se houver dia preferido, alinha para véspera do próximo
    let end: Date
    if (preferredRenewalDay) {
      const base = new Date(start.getTime() + plan.cycleInDays * 24 * 60 * 60 * 1000)
      const nextPref = nextOccurrenceOfDay(base, preferredRenewalDay)
      const dayBefore = new Date(nextPref)
      dayBefore.setDate(dayBefore.getDate() - 1)
      end = getBrazilEndOfDay(dayBefore)
    } else {
      end = new Date(start.getTime() + plan.cycleInDays * 24 * 60 * 60 * 1000)
    }

    const priceToCharge = overridePrice != null ? Number(overridePrice) : Number(plan.price)

    const result = await prisma.$transaction(async (tx) => {
      const newSub = await tx.clientSubscription.create({
        data: { clientId: sub.clientId, planId: sub.planId, startDate: start, endDate: end, status: 'ACTIVE', preferredRenewalDay }
      })

      await tx.financialRecord.create({
        data: {
          tenantId: user.tenantId,
          type: 'INCOME',
          amount: priceToCharge,
          description: `Renovação de assinatura: ${plan.name} para ${client.name}`,
          category: 'Assinaturas',
          reference: `clientSubscription:${newSub.id}:renewal`,
          recordSource: 'SUBSCRIPTION_RENEWAL_INCOME',
          paymentMethod: paymentMethod || null,
          date: paymentDate ? new Date(paymentDate) : undefined,
          endUserId: client.id
        }
      })

      return newSub
    })

    return NextResponse.json({ clientSubscription: result, message: 'Assinatura renovada com sucesso' })
  } catch (error: any) {
    console.error('Erro ao renovar assinatura:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
