export type CoverageInput = {
  hasActiveSubscriptionCoveringAll: boolean
  hasEligiblePackageCombo: boolean
  packageCreditsRemaining?: number
}

export type CoverageDecision =
  | { covered: true; coveredBy: 'subscription'; message?: string }
  | { covered: true; coveredBy: 'package'; creditsRemaining: number; message?: string }
  | { covered: false }

// Regras principais:
// - Se houver assinatura ativa que cubra todos os serviços, prioridade absoluta: cobre e zera preço.
// - Caso contrário, se houver pacote com combo exato e saldo > 0, cobre por pacote.
// - Caso contrário, não cobre.
export function decideCoverage(input: CoverageInput): CoverageDecision {
  if (input.hasActiveSubscriptionCoveringAll) {
    return { covered: true, coveredBy: 'subscription', message: 'Coberto pela assinatura ativa' }
  }
  if (input.hasEligiblePackageCombo && (input.packageCreditsRemaining || 0) > 0) {
    return { covered: true, coveredBy: 'package', creditsRemaining: input.packageCreditsRemaining || 0, message: 'Coberto por pacote com saldo' }
  }
  return { covered: false }
}

// Util assíncrona para determinar cobertura (assinatura > pacote) e sugerir token persistente
// Recebe uma instância do Prisma ou transação (tx) com métodos $queryRaw/$queryRawUnsafe
export type CoverageResolution = {
  coveredBy: 'subscription' | 'package' | null
  subscriptionPlanId?: string | null
  clientPackageId?: string | null
}

export async function resolveCoverageForServices(
  prismaOrTx: { $queryRaw: any; $queryRawUnsafe: any },
  params: { tenantId: string; clientId: string; serviceIds: string[] }
): Promise<CoverageResolution> {
  const { tenantId, clientId, serviceIds } = params
  const now = new Date()

  // 1) Verificar assinatura ativa que cubra todo o combo
  try {
    const planRows = await (prismaOrTx as any).$queryRaw`
      SELECT cs.planId as planId
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON sp.id = cs.planId AND sp.isActive = 1 AND sp.tenantId = ${tenantId}
      WHERE cs.clientId = ${clientId}
        AND cs.status = 'ACTIVE'
        AND cs.startDate <= ${now}
        AND cs.endDate >= ${now}
    ` as Array<{ planId: string }>
    if (planRows.length > 0) {
      const ids: string[] = [...new Set(planRows.map((r: { planId: string }) => r.planId))]
      const placeholders = ids.map(() => '?').join(',')
      const allowed = await (prismaOrTx as any).$queryRawUnsafe(
        `SELECT link.B as planId, link.A as serviceId FROM _ServiceToSubscriptionPlan link WHERE link.B IN (${placeholders})`,
        ...ids
      ) as Array<{ planId: string, serviceId: string }>
      const byPlan = new Map<string, Set<string>>()
      for (const row of allowed) {
        const set = byPlan.get(row.planId) || new Set<string>()
        set.add(row.serviceId)
        byPlan.set(row.planId, set)
      }
      for (const pid of ids) {
        const set = byPlan.get(pid) || new Set<string>()
        if (serviceIds.every(id => set.has(id))) {
          return { coveredBy: 'subscription', subscriptionPlanId: pid as string, clientPackageId: null }
        }
      }
    }
  } catch (_) {
    // Em caso de erro, ignora e segue para pacote
  }

  // 2) Verificar pacote com combo exato e saldo > 0
  try {
    const packagesBase = await (prismaOrTx as any).$queryRaw`
      SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
      FROM client_packages
      WHERE clientId = ${clientId}
        AND (expiresAt IS NULL OR expiresAt > ${now})
    ` as Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>
    if (packagesBase.length > 0) {
      const ids: string[] = packagesBase.map((p: { id: string }) => p.id)
      const placeholders = ids.map(() => '?').join(',')
      const allowedRows = await (prismaOrTx as any).$queryRawUnsafe(
        `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
        ...ids
      ) as Array<{ clientPackageId: string, serviceId: string }>
      const allowedMap = new Map<string, string[]>()
      for (const row of allowedRows) {
        const arr = allowedMap.get(row.clientPackageId) || []
        arr.push(row.serviceId)
        allowedMap.set(row.clientPackageId, arr)
      }
      const withRemaining = packagesBase.filter((p: { creditsTotal: number; usedCredits: number }) => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)
      const eligible = withRemaining.filter((p: { id: string }) => {
        const allowed = allowedMap.get(p.id) || []
        if (allowed.length !== serviceIds.length) return false
        const set = new Set(allowed)
        return serviceIds.every(id => set.has(id))
      })
      if (eligible.length > 0) {
        eligible.sort((a: any, b: any) => {
          const ax = a.expiresAt ? a.expiresAt.getTime() : Number.POSITIVE_INFINITY
          const bx = b.expiresAt ? b.expiresAt.getTime() : Number.POSITIVE_INFINITY
          if (ax !== bx) return ax - bx
          return a.purchasedAt.getTime() - b.purchasedAt.getTime()
        })
        return { coveredBy: 'package', clientPackageId: eligible[0].id, subscriptionPlanId: null }
      }
    }
  } catch (_) {
    // Ignorar e retornar não coberto
  }

  return { coveredBy: null, subscriptionPlanId: null, clientPackageId: null }
}

export function buildCoverageToken(resolution: CoverageResolution): string | null {
  if (resolution.coveredBy === 'subscription' && resolution.subscriptionPlanId) {
    return `SUB:${resolution.subscriptionPlanId}`
  }
  if (resolution.coveredBy === 'package' && resolution.clientPackageId) {
    return `PKG:${resolution.clientPackageId}`
  }
  return null
}
