import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/client-coverage-combo?businessSlug=&phone=&serviceIds=a,b,c
// Retorna cobertura por assinatura (prioridade) ou pacote (combo exato) com saldo
export async function GET(request: NextRequest) {
  try {
    console.log('[coverage-combo][public][GET] Início')
    const { searchParams } = new URL(request.url)
    const businessSlug = searchParams.get('businessSlug')
    const phone = searchParams.get('phone')
    const rawServiceIds = searchParams.get('serviceIds')

    if (!businessSlug || !phone || !rawServiceIds) {
      return NextResponse.json({ message: 'Parâmetros obrigatórios: businessSlug, phone, serviceIds' }, { status: 400 })
    }
    const serviceIds = rawServiceIds.split(',').filter(Boolean)
    console.log('[coverage-combo][public][GET] Params:', { businessSlug, phone, serviceIdsCount: serviceIds.length })
    if (serviceIds.length === 0) {
      return NextResponse.json({ message: 'serviceIds inválido' }, { status: 400 })
    }

    // Encontrar tenant por slug
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true, businessConfig: { path: '$.customLink', equals: businessSlug } },
      select: { id: true }
    })
    console.log('[coverage-combo][public][GET] Tenant encontrado?', !!tenant)
    if (!tenant) return NextResponse.json({ message: 'Estabelecimento não encontrado' }, { status: 404 })

    // Encontrar cliente por telefone
  const client = await prisma.endUser.findFirst({ where: { tenantId: tenant.id, phone, isActive: true }, select: { id: true } })
  console.log('[coverage-combo][public][GET] Cliente encontrado?', !!client)
    if (!client) return NextResponse.json({ covered: false })

    const now = new Date()

    // 1) Assinatura ativa
    try {
      console.log('[coverage-combo][public][GET] Tentando via Prisma (assinaturas com include de serviços)')
      const subs = await prisma.clientSubscription.findMany({
        where: {
          clientId: client.id,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          plan: { isActive: true, tenantId: tenant.id }
        },
        include: { plan: { include: { services: { select: { id: true, name: true } } } } }
      })
      console.log('[coverage-combo][public][GET] Prisma retornou assinaturas:', subs.length)

      const coveringSub = subs.find((s: { plan: { id: string; name: string; services?: { id: string; name?: string }[] } }) => {
        const allowedSet = new Set((s.plan?.services || []).map((x: { id: string }) => x.id))
        return serviceIds.every(id => allowedSet.has(id))
      })
      if (coveringSub) {
        console.log('[coverage-combo][public][GET] Coberto por assinatura (Prisma):', coveringSub.plan?.id)
        return NextResponse.json({ covered: true, coveredBy: 'subscription', subscription: { planId: coveringSub.plan.id, planName: coveringSub.plan.name } })
      }
    } catch (e) {
      console.warn('[coverage-combo][public][GET] Falha via Prisma; fallback SQL. err=', (e as any)?.message)
      // Segue para fallback SQL
    }

    // Fallback SQL: checar assinatura ativa e serviços via join table
    try {
      console.log('[coverage-combo][public][GET] Fallback SQL: buscando planos do cliente')
      const planRows = await prisma.$queryRaw<Array<{ planId: string }>>`
        SELECT cs.planId as planId
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId AND sp.isActive = 1 AND sp.tenantId = ${tenant.id}
        WHERE cs.clientId = ${client.id}
          AND cs.status = 'ACTIVE'
          AND cs.startDate <= ${now}
          AND cs.endDate >= ${now}
      `
      console.log('[coverage-combo][public][GET] Fallback SQL: planos encontrados=', planRows.length)
      if (planRows.length > 0) {
        const ids = [...new Set(planRows.map(r => r.planId))]
        const placeholders = ids.map(() => '?').join(',')
        const allowed = await prisma.$queryRawUnsafe<Array<{ planId: string, serviceId: string }>>(
          `SELECT link.B as planId, link.A as serviceId FROM _ServiceToSubscriptionPlan link WHERE link.B IN (${placeholders})`,
          ...ids
        )
        console.log('[coverage-combo][public][GET] Fallback SQL: linhas join table=', allowed.length)
        const byPlan = new Map<string, Set<string>>()
        for (const row of allowed) {
          const set = byPlan.get(row.planId) || new Set<string>()
          set.add(row.serviceId)
          byPlan.set(row.planId, set)
        }
        for (const pid of ids) {
          const set = byPlan.get(pid) || new Set<string>()
          if (serviceIds.every(id => set.has(id))) {
            console.log('[coverage-combo][public][GET] Coberto por assinatura (SQL) planId=', pid)
            return NextResponse.json({ covered: true, coveredBy: 'subscription', subscription: { planId: pid } })
          }
        }
      }
    } catch (e) {
      console.warn('[coverage-combo][public][GET] Erro no fallback SQL de assinatura:', (e as any)?.message)
      // Ignora e segue para checagem de pacotes
    }

    // 2) Pacote (combo exato) com saldo
    console.log('[coverage-combo][public][GET] Verificando pacotes elegíveis')
    const packagesBase = await prisma.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
      SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
      FROM client_packages
      WHERE clientId = ${client.id}
        AND (expiresAt IS NULL OR expiresAt > ${now})
    `
    console.log('[coverage-combo][public][GET] Pacotes base encontrados=', packagesBase.length)
    let allowedRows: Array<{ clientPackageId: string, serviceId: string }> = []
    if (packagesBase.length > 0) {
      const ids = packagesBase.map(p => p.id)
      const placeholders = ids.map(() => '?').join(',')
      allowedRows = await prisma.$queryRawUnsafe(
        `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
        ...ids
      )
      console.log('[coverage-combo][public][GET] Linhas serviços permitidos (pacotes)=', allowedRows.length)
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
      console.log('[coverage-combo][public][GET] Coberto por pacote. qtd elegíveis=', eligible.length)
      eligible.sort((a, b) => {
        const ax = a.expiresAt ? a.expiresAt.getTime() : Number.POSITIVE_INFINITY
        const bx = b.expiresAt ? b.expiresAt.getTime() : Number.POSITIVE_INFINITY
        if (ax !== bx) return ax - bx
        return a.purchasedAt.getTime() - b.purchasedAt.getTime()
      })
      const best = eligible[0]
      const creditsRemaining = (best.creditsTotal || 0) - (best.usedCredits || 0)
      return NextResponse.json({ covered: true, coveredBy: 'package', package: { id: best.id, creditsRemaining, expiresAt: best.expiresAt } })
    }

    console.log('[coverage-combo][public][GET] Sem cobertura encontrada')
    return NextResponse.json({ covered: false })
  } catch (error) {
    console.error('[coverage-combo][public][GET] Erro inesperado:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
