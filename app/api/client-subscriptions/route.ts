import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// POST /api/client-subscriptions - vender uma assinatura para um cliente
// body: { clientId, planId, startDate?, endDate?, overridePrice? }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode vender assinaturas' }, { status: 403 })
    }

    const { clientId, planId, startDate, endDate, overridePrice } = await request.json()
    if (!clientId || !planId) {
      return NextResponse.json({ message: 'clientId e planId são obrigatórios' }, { status: 400 })
    }

    // Valida tenant e dados
    let plan: any
    try {
      plan = await (prisma as any).subscriptionPlan.findFirst({ where: { id: planId, tenantId: user.tenantId, isActive: true } })
    } catch {
      const rows = await prisma.$queryRaw<Array<any>>`
        SELECT id, name, price, cycleInDays FROM subscription_plans WHERE id = ${planId} AND tenantId = ${user.tenantId} AND isActive = true LIMIT 1
      `
      plan = rows[0]
    }
    if (!plan) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + plan.cycleInDays * 24 * 60 * 60 * 1000)

    const priceToCharge = overridePrice != null ? Number(overridePrice) : Number(plan.price)

    const result = await prisma.$transaction(async (tx) => {
  const sub = await (tx as any).clientSubscription.create({
        data: { clientId, planId, startDate: start, endDate: end, status: 'ACTIVE' }
      })

      await tx.financialRecord.create({
        data: {
          tenantId: user.tenantId,
          type: 'INCOME',
          amount: priceToCharge,
          description: `Venda de assinatura: ${plan.name} para ${client.name}`,
          category: 'Assinaturas',
          reference: `clientSubscription:${sub.id}`
        }
      })

      return sub
    })

    return NextResponse.json({ clientSubscription: result, message: 'Assinatura vendida com sucesso' })
  } catch (error: any) {
    console.error('Erro ao vender assinatura:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// GET /api/client-subscriptions?clientId=
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const clientIdsParam = searchParams.get('clientIds')

    if (!clientId && !clientIdsParam) {
      return NextResponse.json({ message: 'clientId ou clientIds são obrigatórios' }, { status: 400 })
    }

    if (clientId) {
      try {
        const page = Number(searchParams.get('page') || '1')
        const pageSize = Math.min(50, Number(searchParams.get('pageSize') || '10'))
        const skip = (page - 1) * pageSize
        const where = { clientId, plan: { tenantId: user.tenantId } }
        const delegate: any = (prisma as any).clientSubscription
        const [items, total] = await Promise.all([
          delegate.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: { plan: true },
            skip,
            take: pageSize
          }).catch(async () => {
            // fallback sem paginação refinada (usaremos SQL abaixo se necessário)
            const rows = await prisma.$queryRaw<Array<any>>`
              SELECT cs.*, sp.name as planName, sp.price as planPrice, sp.cycleInDays
              FROM client_subscriptions cs
              JOIN subscription_plans sp ON sp.id = cs.planId
              WHERE cs.clientId = ${clientId} AND sp.tenantId = ${user.tenantId}
              ORDER BY cs.startDate DESC
              LIMIT ${pageSize} OFFSET ${skip}
            `
            return rows.map(r => ({ id: r.id, clientId: r.clientId, planId: r.planId, startDate: r.startDate, endDate: r.endDate, status: r.status, plan: { id: r.planId, name: r.planName, price: r.planPrice, cycleInDays: r.cycleInDays } }))
          }),
          delegate?.count ? delegate.count({ where }).catch(async () => {
            const cnt = await prisma.$queryRaw<Array<any>>`
              SELECT COUNT(*) as c FROM client_subscriptions cs JOIN subscription_plans sp ON sp.id = cs.planId WHERE cs.clientId = ${clientId} AND sp.tenantId = ${user.tenantId}
            `
            return Number(cnt[0]?.c || 0)
          }) : prisma.$queryRaw<Array<any>>`
            SELECT COUNT(*) as c FROM client_subscriptions cs JOIN subscription_plans sp ON sp.id = cs.planId WHERE cs.clientId = ${clientId} AND sp.tenantId = ${user.tenantId}
          `.then((cnt: any) => Number(cnt[0]?.c || 0))
        ])
        return NextResponse.json({ items, meta: { page, pageSize, total, hasNext: total > page * pageSize } })
      } catch {
        // Fallback SQL bruto
        const page = Number(searchParams.get('page') || '1')
        const pageSize = Math.min(50, Number(searchParams.get('pageSize') || '10'))
        const offset = (page - 1) * pageSize
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT cs.*, sp.name as planName, sp.price as planPrice, sp.cycleInDays
          FROM client_subscriptions cs
          JOIN subscription_plans sp ON sp.id = cs.planId
          WHERE cs.clientId = ${clientId} AND sp.tenantId = ${user.tenantId}
          ORDER BY cs.startDate DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `
        const countRows = await prisma.$queryRaw<Array<any>>`
          SELECT COUNT(*) as c
          FROM client_subscriptions cs
          JOIN subscription_plans sp ON sp.id = cs.planId
          WHERE cs.clientId = ${clientId} AND sp.tenantId = ${user.tenantId}
        `
        const total = Number(countRows[0]?.c || 0)
        const items = rows.map(r => ({
          id: r.id,
          clientId: r.clientId,
          planId: r.planId,
          startDate: r.startDate,
          endDate: r.endDate,
            status: r.status,
          plan: { id: r.planId, name: r.planName, price: r.planPrice, cycleInDays: r.cycleInDays }
        }))
        return NextResponse.json({ items, meta: { page, pageSize, total, hasNext: total > page * pageSize }, warning: 'Listagem via SQL bruto (delegate indisponível).' })
      }
    }

    // Batch
    const ids = (clientIdsParam || '').split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ message: 'Nenhum clientId válido em clientIds' }, { status: 400 })
    let subs: any[] = []
    try {
      subs = await (prisma as any).clientSubscription.findMany({
        where: { clientId: { in: ids }, plan: { tenantId: user.tenantId } },
        orderBy: { startDate: 'desc' },
        include: { plan: true }
      })
    } catch {
      const rows = await prisma.$queryRaw<Array<any>>`
        SELECT cs.*, sp.name as planName, sp.price as planPrice, sp.cycleInDays
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId
  WHERE cs.clientId IN (${Prisma.join(ids)}) AND sp.tenantId = ${user.tenantId}
        ORDER BY cs.startDate DESC
      `
      subs = rows.map(r => ({
        id: r.id,
        clientId: r.clientId,
        planId: r.planId,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        plan: { id: r.planId, name: r.planName, price: r.planPrice, cycleInDays: r.cycleInDays }
      }))
    }
    const byClient: Record<string, any[]> = {}
    for (const s of subs) {
      if (!byClient[s.clientId]) byClient[s.clientId] = []
      byClient[s.clientId].push(s)
    }
    // Garante chaves vazias para clientes sem assinatura
    ids.forEach(id => { if (!byClient[id]) byClient[id] = [] })
    return NextResponse.json({ map: byClient })
  } catch (error: any) {
    console.error('Erro ao listar assinaturas do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// PUT /api/client-subscriptions body: { id, action: 'cancel', refundAmount? }
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode alterar assinaturas' }, { status: 403 })
    }
    const { id, action, refundAmount } = await request.json()
    if (!id || !action) return NextResponse.json({ message: 'id e action são obrigatórios' }, { status: 400 })
    let subscription: any
    try {
      subscription = await (prisma as any).clientSubscription.findFirst({ where: { id, plan: { tenantId: user.tenantId } }, include: { plan: true, client: true } })
    } catch {
      const rows = await prisma.$queryRaw<Array<any>>`
        SELECT cs.*, sp.name as planName, sp.price as planPrice, sp.cycleInDays, eu.name as clientName
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId
        JOIN end_users eu ON eu.id = cs.clientId
        WHERE cs.id = ${id} AND sp.tenantId = ${user.tenantId}
        LIMIT 1
      `
      if (rows.length) {
        const r = rows[0]
        subscription = { ...r, plan: { id: r.planId, name: r.planName }, client: { id: r.clientId, name: r.clientName } }
      }
    }
    if (!subscription) return NextResponse.json({ message: 'Assinatura não encontrada' }, { status: 404 })

    if (action === 'cancel') {
      if (subscription.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'Assinatura não está ativa' }, { status: 400 })
      }
      // Tenta via delegate; se falhar, faz SQL bruto
      try {
        await prisma.$transaction(async (tx) => {
          await (tx as any).clientSubscription.update({ where: { id }, data: { status: 'CANCELED' } })
          if (refundAmount && Number(refundAmount) > 0) {
            await tx.financialRecord.create({
              data: {
                tenantId: user.tenantId,
                type: 'EXPENSE',
                amount: Number(refundAmount),
                description: `Estorno de assinatura: ${subscription.plan?.name} para ${subscription.client?.name}`,
                category: 'Assinaturas',
                reference: `clientSubscriptionRefund:${id}`
              }
            })
          }
        })
      } catch {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe('UPDATE client_subscriptions SET status = ? WHERE id = ?', 'CANCELED', id)
          if (refundAmount && Number(refundAmount) > 0) {
            await tx.financialRecord.create({
              data: {
                tenantId: user.tenantId,
                type: 'EXPENSE',
                amount: Number(refundAmount),
                description: `Estorno de assinatura: ${subscription.plan?.name} para ${subscription.client?.name}`,
                category: 'Assinaturas',
                reference: `clientSubscriptionRefund:${id}`
              }
            })
          }
        })
      }
      return NextResponse.json({ message: 'Assinatura cancelada com sucesso' })
    }

    return NextResponse.json({ message: 'Ação não suportada' }, { status: 400 })
  } catch (error: any) {
    console.error('Erro ao atualizar assinatura:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
