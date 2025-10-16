import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AuthError } from '@/lib/auth'
import { getBrazilNow } from '@/lib/timezone'

// GET /api/memberships/stats
// Retorna métricas agregadas para o dashboard de "Assinaturas e Pacotes"
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    const url = new URL(request.url)
    const sp = url.searchParams
    const now = getBrazilNow()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const fromParam = sp.get('from')
    const toParam = sp.get('to')
    const parsedFrom = fromParam ? new Date(fromParam) : null
    const parsedTo = toParam ? new Date(toParam) : null
    const periodFrom = parsedFrom && !isNaN(parsedFrom.getTime()) ? parsedFrom : defaultFrom
    const periodTo = parsedTo && !isNaN(parsedTo.getTime()) ? parsedTo : now
    const firstOfMonth = defaultFrom

    // MRR e contagem de assinaturas ativas
    const subsRows = await prisma.$queryRaw<Array<{ planId: string; planName: string; planPrice: any }>>`
      SELECT cs.planId as planId, sp.name as planName, sp.price as planPrice
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON sp.id = cs.planId
      WHERE cs.status = 'ACTIVE' AND sp.tenantId = ${tenantId}
    `
    const activeSubscriptionsCount = subsRows.length
    const mrr = subsRows.reduce((sum, r) => sum + Number(r.planPrice || 0), 0)
    const byPlan = new Map<string, { name: string; revenue: number }>()
    for (const r of subsRows) {
      const cur = byPlan.get(r.planId)
      const add = Number(r.planPrice || 0)
      if (cur) byPlan.set(r.planId, { name: cur.name, revenue: cur.revenue + add })
      else byPlan.set(r.planId, { name: r.planName || 'Plano', revenue: add })
    }
    const topSubscriptionPlans = Array.from(byPlan.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    // Retenção: base simples por data de início e fim
    const totalAtStartRows = await prisma.$queryRaw<Array<{ c: any }>>`
      SELECT COUNT(*) as c
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON sp.id = cs.planId
      WHERE sp.tenantId = ${tenantId}
        AND cs.startDate < ${firstOfMonth}
        AND cs.endDate >= ${firstOfMonth}
    `
    const churnRows = await prisma.$queryRaw<Array<{ c: any }>>`
      SELECT COUNT(*) as c
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON sp.id = cs.planId
      WHERE sp.tenantId = ${tenantId}
        AND cs.status IN ('EXPIRED','CANCELED')
        AND cs.endDate >= ${firstOfMonth} AND cs.endDate <= ${now}
    `
    const totalAtStart = Number(totalAtStartRows[0]?.c || 0)
    const churnedThisMonth = Number(churnRows[0]?.c || 0)
    const retentionRate = totalAtStart > 0 ? Math.max(0, Math.min(1, (totalAtStart - churnedThisMonth) / totalAtStart)) : null

    // Pacotes ativos (saldo > 0 e não expirados)
    const activePkgRows = await prisma.$queryRaw<Array<{ id: string; creditsTotal: any; usedCredits: any }>>`
      SELECT cp.id, cp.creditsTotal, cp.usedCredits
      FROM client_packages cp
      JOIN end_users eu ON eu.id = cp.clientId
      WHERE eu.tenantId = ${tenantId}
        AND (cp.expiresAt IS NULL OR cp.expiresAt > ${now})
    `
    const activePackagesCount = activePkgRows.filter(r => (Number(r.creditsTotal || 0) - Number(r.usedCredits || 0)) > 0).length

    // Vendas de pacotes no mês
    const salesRows = await prisma.$queryRaw<Array<{ totalPrice: any }>>`
      SELECT sp.totalPrice
      FROM client_packages cp
      JOIN end_users eu ON eu.id = cp.clientId
      JOIN service_packages sp ON sp.id = cp.packageId
      WHERE eu.tenantId = ${tenantId}
        AND cp.purchasedAt >= ${periodFrom}
        AND cp.purchasedAt <= ${periodTo}
    `
    const packageSalesThisMonth = {
      count: salesRows.length,
      revenue: salesRows.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0)
    }

    // Pacotes mais vendidos (all-time)
    const topRows = await prisma.$queryRaw<Array<{ name: string; cnt: any }>>`
      SELECT sp.name as name, COUNT(*) as cnt
      FROM client_packages cp
      JOIN end_users eu ON eu.id = cp.clientId
      JOIN service_packages sp ON sp.id = cp.packageId
      WHERE eu.tenantId = ${tenantId}
      GROUP BY sp.name
      ORDER BY cnt DESC
      LIMIT 5
    `
    const topSellingPackages = topRows.map(r => ({ name: r.name, count: Number(r.cnt || 0) }))

    // Créditos usados no mês (estimado por appointments concluídos com indícios de pacote)
    const creditsUsedRows = await prisma.$queryRaw<Array<{ c: any }>>`
      SELECT COUNT(*) as c
      FROM appointments a
      WHERE a.tenantId = ${tenantId}
        AND a.status = 'COMPLETED'
        AND a.completedAt >= ${periodFrom}
        AND a.completedAt <= ${periodTo}
        AND (
          a.paymentMethod = 'PREPAID' OR
          (a.paymentSource IS NOT NULL AND a.paymentSource LIKE '%PACOTE%') OR
          (a.coverageToken IS NOT NULL AND a.coverageToken LIKE 'PKG:%')
        )
    `
    const creditsUsedThisMonth = Number(creditsUsedRows[0]?.c || 0)

    // ---------------------------
    // Financeiro (mês corrente)
    // ---------------------------
    const finRows = await prisma.$queryRaw<Array<{ category: string | null; type: string; amount: any }>>`
      SELECT fr.category as category, fr.type as type, fr.amount as amount
      FROM financial_records fr
      WHERE fr.tenantId = ${tenantId}
        AND fr.date >= ${periodFrom}
        AND fr.date <= ${periodTo}
    `
    const sum = (items: typeof finRows, where: (r: any) => boolean) => items.filter(where).reduce((acc, r) => acc + Number(r.amount || 0), 0)
    const revenueSubscriptions = sum(finRows, r => r.type === 'INCOME' && (r.category || '').toLowerCase().includes('assin'))
    const revenuePackages = sum(finRows, r => r.type === 'INCOME' && (r.category || '').toLowerCase().includes('pacote'))
    const refunds = sum(finRows, r => r.type === 'EXPENSE' && (r.category || '').toLowerCase().includes('estorno'))
    const netRevenue = revenueSubscriptions + revenuePackages - refunds

    return NextResponse.json({
      mrr,
      activeSubscriptionsCount,
      activePackagesCount,
      topSubscriptionPlans,
      topSellingPackages,
      packageSalesThisMonth,
      creditsUsedThisMonth,
      retentionRate,
      financialSummary: {
        revenueSubscriptions,
        revenuePackages,
        refunds,
        netRevenue
      }
    })
  } catch (error: any) {
    const status = error instanceof AuthError ? error.status : (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro ao carregar estatísticas' }, { status })
  }
}
