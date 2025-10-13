import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { decideCoverage } from "@/lib/coverage-logic"

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId é obrigatório' }, { status: 400 })
    }

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { services: { select: { id: true } }, endUser: { select: { id: true } } }
    })
    if (!existingAppointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }
    const clientId = existingAppointment.endUser?.id
    const tenantId = (existingAppointment as any).tenantId
    const serviceIdsSelected = existingAppointment.services.map(s => s.id)
    if (!clientId || !tenantId || serviceIdsSelected.length === 0) {
      return NextResponse.json({ covered: false })
    }

    // Verificar assinatura ativa que cubra todos os serviços
    const now = new Date()
    let hasActiveSubscriptionCoveringAll = false
    try {
      const planRows = await prisma.$queryRaw<Array<{ planId: string }>>`
        SELECT cs.planId as planId
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId AND sp.isActive = 1 AND sp.tenantId = ${tenantId}
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
          if (serviceIdsSelected.every(id => set.has(id))) {
            hasActiveSubscriptionCoveringAll = true
            break
          }
        }
      }
    } catch {}

    // Verificar pacote elegível com saldo
    let hasEligiblePackageCombo = false
    let packageCreditsRemaining: number | undefined = undefined
    try {
      const packagesBase = await prisma.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
        SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
        FROM client_packages
        WHERE clientId = ${clientId}
          AND (expiresAt IS NULL OR expiresAt > ${now})
      `
      if (packagesBase.length > 0) {
        const ids = packagesBase.map(p => p.id)
        const placeholders = ids.map(() => '?').join(',')
        const allowedRows = await prisma.$queryRawUnsafe<Array<{ clientPackageId: string, serviceId: string }>>(
          `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
          ...ids
        )
        const allowedMap = new Map<string, string[]>()
        for (const row of allowedRows) {
          const arr = allowedMap.get(row.clientPackageId) || []
          arr.push(row.serviceId)
          allowedMap.set(row.clientPackageId, arr)
        }
        const withRemaining = packagesBase.filter(p => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)
        const eligible = withRemaining.filter(p => {
          const allowed = allowedMap.get(p.id) || []
          if (allowed.length !== serviceIdsSelected.length) return false
          const allowedSet = new Set(allowed)
          for (const id of serviceIdsSelected) { if (!allowedSet.has(id)) return false }
          return true
        })
        if (eligible.length > 0) {
          hasEligiblePackageCombo = true
          const best = eligible[0]
          packageCreditsRemaining = (best.creditsTotal || 0) - (best.usedCredits || 0)
        }
      }
    } catch {}

    const decision = decideCoverage({ hasActiveSubscriptionCoveringAll, hasEligiblePackageCombo, packageCreditsRemaining })
    return NextResponse.json(decision)
  } catch (error) {
    console.error('Erro na cobertura:', error)
    return NextResponse.json({ covered: false })
  }
}
