import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/client-coverage-combo?clientId=&serviceIds=a,b,c
// Retorna cobertura por assinatura (prioridade) ou pacote (combo exato) com saldo
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!['OWNER', 'COLLABORATOR'].includes(user.role)) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const rawServiceIds = searchParams.get('serviceIds') // csv
    if (!clientId || !rawServiceIds) {
      return NextResponse.json({ message: 'clientId e serviceIds são obrigatórios' }, { status: 400 })
    }
    const serviceIds = rawServiceIds.split(',').filter(Boolean)
    if (serviceIds.length === 0) {
      return NextResponse.json({ message: 'serviceIds inválido' }, { status: 400 })
    }

    // Valida cliente do tenant
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const now = new Date()

    // 1) Cobertura por assinatura ativa (plano inclui todos os serviços)
    try {
      const subs = await prisma.clientSubscription.findMany({
        where: {
          clientId,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          plan: { isActive: true, tenantId: user.tenantId }
        },
        include: { plan: { include: { services: { select: { id: true, name: true } } } } }
      })
      const coveringSub = subs.find((s: { plan: { id: string; name: string; services?: { id: string; name?: string }[] } }) => {
        const allowedSet = new Set((s.plan?.services || []).map((x: { id: string }) => x.id))
        return serviceIds.every(id => allowedSet.has(id))
      })
      if (coveringSub) {
        return NextResponse.json({
          covered: true,
          coveredBy: 'subscription',
          subscription: { planId: coveringSub.plan.id, planName: coveringSub.plan.name },
          message: `Coberto pela assinatura: ${coveringSub.plan.name}`,
        })
      }
    } catch (e) {
      // Segue para fallback SQL
    }

    // Fallback SQL: checar assinatura ativa e serviços via join table
    try {
      const planRows = await prisma.$queryRaw<Array<{ planId: string }>>`
        SELECT cs.planId as planId
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId AND sp.isActive = 1 AND sp.tenantId = ${user.tenantId}
        WHERE cs.clientId = ${clientId}
          AND cs.status = 'ACTIVE'
          AND cs.startDate <= ${now}
          AND cs.endDate >= ${now}
      `
      if (planRows.length > 0) {
        const ids = [...new Set(planRows.map(r => r.planId))]
        const placeholders = ids.map(() => '?').join(',')
        const allowed = await prisma.$queryRawUnsafe<Array<{ planId: string, serviceId: string }>>(
          `SELECT link.B as planId, link.A as serviceId FROM _ServiceToSubscriptionPlan link WHERE link.B IN (${placeholders})`,
          ...ids
        )
        const byPlan = new Map<string, Set<string>>()
        for (const row of allowed) {
          const set = byPlan.get(row.planId) || new Set<string>()
          set.add(row.serviceId)
          byPlan.set(row.planId, set)
        }
        for (const pid of ids) {
          const set = byPlan.get(pid) || new Set<string>()
          if (serviceIds.every(id => set.has(id))) {
            return NextResponse.json({ covered: true, coveredBy: 'subscription', subscription: { planId: pid }, message: 'Coberto pela assinatura.' })
          }
        }
      }
    } catch (e) {
      // Ignora e segue para checagem de pacotes
    }

    // 2) Cobertura por pacote (combo exato) com saldo > 0
    const packagesBase = await prisma.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
      SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
      FROM client_packages
      WHERE clientId = ${clientId}
        AND (expiresAt IS NULL OR expiresAt > ${now})
    `
    let allowedRows: Array<{ clientPackageId: string, serviceId: string }> = []
    if (packagesBase.length > 0) {
      const ids = packagesBase.map(p => p.id)
      const placeholders = ids.map(() => '?').join(',')
      allowedRows = await prisma.$queryRawUnsafe(
        `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
        ...ids
      )
    }
    const allowedMap = new Map<string, string[]>()
    for (const row of allowedRows) {
      const arr = allowedMap.get(row.clientPackageId) || []
      arr.push(row.serviceId)
      allowedMap.set(row.clientPackageId, arr)
    }
    const withRemaining = packagesBase.filter(p => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)
    const selectedSet = new Set(serviceIds)
    const eligible = withRemaining.filter(p => {
      const allowed = allowedMap.get(p.id) || []
      if (allowed.length !== serviceIds.length) return false
      const allowedSet = new Set(allowed)
      for (const id of selectedSet) { if (!allowedSet.has(id)) return false }
      return true
    })
    if (eligible.length > 0) {
      eligible.sort((a, b) => {
        const ax = a.expiresAt ? a.expiresAt.getTime() : Number.POSITIVE_INFINITY
        const bx = b.expiresAt ? b.expiresAt.getTime() : Number.POSITIVE_INFINITY
        if (ax !== bx) return ax - bx
        return a.purchasedAt.getTime() - b.purchasedAt.getTime()
      })
      const best = eligible[0]
      const creditsRemaining = (best.creditsTotal || 0) - (best.usedCredits || 0)
      return NextResponse.json({
        covered: true,
        coveredBy: 'package',
        package: { id: best.id, creditsRemaining, expiresAt: best.expiresAt },
        message: `Coberto por pacote. Créditos restantes: ${creditsRemaining}`
      })
    }

    return NextResponse.json({ covered: false })
  } catch (error: any) {
    console.error('Erro em /api/client-coverage-combo:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
