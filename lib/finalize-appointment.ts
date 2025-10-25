import { toLocalISOString, getBrazilNow } from '@/lib/timezone'

// Núcleo único de conclusão de agendamento.
// Responsável por:
// - Validar cobertura PREPAID (assinatura > pacote) e debitar quando aplicável
// - Definir paymentSource ('SUBSCRIPTION' | 'PACKAGE') quando coberto
// - Calcular/persistir commissionEarned (regras de assinatura ou padrão)
// - Persistir discountApplied = totalPrice quando pré‑pago coberto
// - Marcar status/forma/status de pagamento e completedAt
// - Criar registro financeiro do serviço quando NÃO houver pré‑pago
// - Atualizar estatísticas do cliente (incrementais)
// Observação: "tx" deve ser uma transação Prisma (tx) ou PrismaClient compatível com $queryRaw/$executeRaw

export type FinalizeParams = {
  appointmentId: string
  paymentMethod: string // 'PREPAID' | 'CASH' | 'PIX' | 'CARD'
}

export async function finalizeAppointmentCore(tx: any, params: FinalizeParams) {
  const { appointmentId, paymentMethod } = params

  // 1) Buscar dados essenciais do agendamento
  const existingAppointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      tenantId: true,
      endUserId: true,
      professionalId: true,
      dateTime: true,
      status: true,
      notes: true,
      totalPrice: true,
      duration: true,
      endUser: {
        select: { id: true, name: true }
      },
      professional: {
        select: {
          id: true,
          name: true,
          commissionPercentage: true,
          // Campos opcionais (pode não estar no tipo local)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          subscriptionCommissionType: true,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          subscriptionCommissionValue: true
        }
      },
      services: { select: { id: true, name: true, price: true, duration: true } }
    }
  })

  if (!existingAppointment) {
    throw new Error('Agendamento não encontrado para conclusão')
  }

  // 2) Preparos e defaults
  const wantsToUseCredit = paymentMethod === 'PREPAID'
  const serviceIdsSelected: string[] = (existingAppointment.services || []).map((s: any) => s.id)
  let totalPrice = Number(existingAppointment.totalPrice || 0)
  if (!totalPrice || totalPrice <= 0) {
    totalPrice = (existingAppointment.services || []).reduce((t: number, s: any) => t + Number(s.price || 0), 0)
  }

  const defaultCommissionPct = Number((existingAppointment as any)?.professional?.commissionPercentage || 0)
  const defaultCommission = defaultCommissionPct > 0 ? Number((totalPrice * defaultCommissionPct).toFixed(2)) : null

  const originalNotes = (existingAppointment.notes || '').toString()
    .replace(/\[(?:USE_CREDIT(?:_SERVICES|_PACKAGE)?|DEBITED_(?:CREDIT|PACKAGE)|SUBSCRIPTION_COVERED|PACKAGE_(?:COVERED|ELIGIBLE))(?:[^\]]*)\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // 3) Regras de cobertura
  let subscriptionCovered = false
  let debitedPackageId: string | null = null
  let debitedCreditId: string | null = null
  let shouldCreateFinancialRecord = true

  if (wantsToUseCredit) {
    const now = new Date()
    // 3.1) Assinatura ativa cobrindo TODOS os serviços
    try {
      const planRows = await tx.$queryRaw<Array<{ planId: string }>>`
        SELECT cs.planId as planId
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.planId AND sp.isActive = 1 AND sp.tenantId = ${existingAppointment.tenantId}
        WHERE cs.clientId = ${existingAppointment.endUserId}
          AND cs.status = 'ACTIVE'
          AND cs.startDate <= ${now}
          AND cs.endDate >= ${now}
      `
      if (planRows.length > 0) {
  const planIdsSet: Set<string> = new Set<string>(planRows.map((r: { planId: string }) => r.planId))
  const ids: string[] = Array.from(planIdsSet)
        const placeholders = ids.map(() => '?').join(',')
        const allowed = await tx.$queryRawUnsafe(
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
          const set = byPlan.get(pid as string) || new Set<string>()
          if (serviceIdsSelected.every(id => set.has(id))) {
            subscriptionCovered = true
            shouldCreateFinancialRecord = false
            break
          }
        }
      }
    } catch (_) {
      // silenciar e tentar pacote
    }

    // 3.2) Pacote com combo exato e saldo > 0
    if (!subscriptionCovered) {
      try {
        const now2 = new Date()
        const packagesBase = await tx.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
          SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
          FROM client_packages
          WHERE clientId = ${existingAppointment.endUserId}
            AND (expiresAt IS NULL OR expiresAt > ${now2})
        `
        if (packagesBase.length > 0) {
          const ids: string[] = packagesBase.map((p: { id: string }) => p.id)
          const placeholders = ids.map(() => '?').join(',')
          const allowedRows = await tx.$queryRawUnsafe(
            `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
            ...ids
          ) as Array<{ clientPackageId: string, serviceId: string }>
          const allowedMap = new Map<string, string[]>()
          for (const row of allowedRows) {
            const arr = allowedMap.get(row.clientPackageId) || []
            arr.push(row.serviceId)
            allowedMap.set(row.clientPackageId, arr)
          }
          const withRemaining = packagesBase.filter((p: { creditsTotal: number, usedCredits: number }) => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)
          const eligible = withRemaining.filter((p: { id: string }) => {
            const allowed = allowedMap.get(p.id) || []
            if (allowed.length !== serviceIdsSelected.length) return false
            const set = new Set(allowed)
            for (const id of serviceIdsSelected) { if (!set.has(id)) return false }
            return true
          })
          if (eligible.length > 0) {
            eligible.sort((a: any, b: any) => {
              const ax = a.expiresAt ? a.expiresAt.getTime() : Number.POSITIVE_INFINITY
              const bx = b.expiresAt ? b.expiresAt.getTime() : Number.POSITIVE_INFINITY
              if (ax !== bx) return ax - bx
              return a.purchasedAt.getTime() - b.purchasedAt.getTime()
            })
            const best = eligible[0]
            await tx.$executeRaw`
              UPDATE client_packages SET usedCredits = usedCredits + 1 WHERE id = ${best.id}
            `
            debitedPackageId = best.id
            shouldCreateFinancialRecord = false
          }
        }
      } catch (_) {
        // fallback legado abaixo
      }

      // 3.3) Compatibilidade legado (por serviço específico)
      if (!debitedPackageId) {
        const serviceIdToConsume = serviceIdsSelected[0]
        if (serviceIdToConsume) {
          const now3 = new Date()
          const packages = await tx.clientPackage.findMany({
            where: { clientId: existingAppointment.endUserId, OR: [{ expiresAt: null }, { expiresAt: { gt: now3 } }] },
            include: { credits: { where: { serviceId: serviceIdToConsume } } }
          })
          const withBalance = packages
            .map((p: any) => ({ pkg: p, credit: p.credits.find((c: any) => c.serviceId === serviceIdToConsume && c.usedCredits < c.totalCredits) || null }))
            .filter((x: any) => !!x.credit)
          if (withBalance.length > 0) {
            withBalance.sort((a: any, b: any) => {
              const ax = a.pkg.expiresAt ? a.pkg.expiresAt.getTime() : Number.POSITIVE_INFINITY
              const bx = b.pkg.expiresAt ? b.pkg.expiresAt.getTime() : Number.POSITIVE_INFINITY
              return ax - bx
            })
            const chosen = withBalance[0]
            const updatedCredit = await tx.clientPackageCredit.update({ where: { id: chosen.credit.id }, data: { usedCredits: { increment: 1 } } })
            debitedCreditId = updatedCredit.id
            shouldCreateFinancialRecord = false
          }
        }
      }
    }
  }

  // 4) Calcular comissão prevista
  const prof = existingAppointment.professional as any
  let commissionCalculated: number | null = null
  if (prof) {
    if (wantsToUseCredit && (subscriptionCovered || debitedPackageId || debitedCreditId)) {
      // Assinatura tem regra própria; pacote cai no padrão salvo se não houver assinatura
      if (subscriptionCovered) {
        const subType = prof.subscriptionCommissionType as string | null
        const subVal = prof.subscriptionCommissionValue != null ? Number(prof.subscriptionCommissionValue) : null
        if (subType === 'FIXED' && subVal != null && !isNaN(subVal)) {
          commissionCalculated = Number(subVal.toFixed(2))
        } else if (subType === 'PERCENTAGE' && subVal != null && !isNaN(subVal)) {
          commissionCalculated = Number((totalPrice * (subVal / 100)).toFixed(2))
        } else if (defaultCommission !== null) {
          commissionCalculated = defaultCommission
        }
      } else {
        if (defaultCommission !== null) commissionCalculated = defaultCommission
      }
    } else {
      if (defaultCommission !== null) commissionCalculated = defaultCommission
    }
  }

  // 5) Atualizar appointment (status/pagamento/snapshot/notes)
  const appointment = await tx.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'COMPLETED',
      paymentMethod: paymentMethod,
      paymentStatus: 'PAID',
      completedAt: toLocalISOString(getBrazilNow()),
      totalPrice: totalPrice,
      commissionEarned: commissionCalculated,
      notes: originalNotes || null
    },
    include: {
      endUser: true,
      professional: true,
      services: true
    }
  })

  // 6) Definir paymentSource definitivo
  const source = wantsToUseCredit
    ? (subscriptionCovered ? 'SUBSCRIPTION' : ((debitedPackageId || debitedCreditId) ? 'PACKAGE' : null))
    : null

  if (source) {
    await tx.$executeRaw`UPDATE appointments SET paymentSource = ${source} WHERE id = ${appointmentId}`
  }

  // 7) Recalcular comissão com dados atuais (opcional)
  try {
    if (appointment && appointment.professional) {
      const profAny = appointment.professional as any
      const defaultPctNow = Number(profAny.commissionPercentage || 0)
      let computed: number | null = null
      if (source === 'SUBSCRIPTION') {
        const t = profAny.subscriptionCommissionType as string | undefined
        const vRaw = profAny.subscriptionCommissionValue
        const v = vRaw != null ? Number(vRaw) : NaN
        if (t === 'FIXED' && !isNaN(v)) {
          computed = Number(v.toFixed(2))
        } else if (t === 'PERCENTAGE' && !isNaN(v)) {
          computed = Number((Number(totalPrice) * (v / 100)).toFixed(2))
        } else if (defaultPctNow > 0) {
          computed = Number((Number(totalPrice) * defaultPctNow).toFixed(2))
        }
      } else {
        if (defaultPctNow > 0) {
          computed = Number((Number(totalPrice) * defaultPctNow).toFixed(2))
        }
      }
      if (computed !== null) {
        await tx.$executeRaw`UPDATE appointments SET commissionEarned = ${computed} WHERE id = ${appointmentId}`
      }
    }
  } catch (e) {
    console.warn('Falha ao recalcular comissão do agendamento', appointmentId, e)
  }

  // 8) Discount snapshot quando pré‑pago coberto
  try {
    let discount = 0
    if (source === 'SUBSCRIPTION' || source === 'PACKAGE') {
      discount = Number(totalPrice || 0)
    }
    if (!isNaN(discount) && discount > 0) {
      await tx.$executeRaw`UPDATE appointments SET discountApplied = ${discount} WHERE id = ${appointmentId}`
    }
  } catch (e) {
    console.warn('Falha ao calcular discountApplied para agendamento', appointmentId, e)
  }

  // 9) Estatísticas do cliente (incrementais)
  await tx.endUser.update({
    where: { id: appointment.endUserId },
    data: {
      totalVisits: { increment: 1 },
      totalSpent: { increment: totalPrice },
      lastVisit: toLocalISOString(getBrazilNow())
    }
  })

  // 10) Registro financeiro do serviço (apenas quando NÃO pré‑pago)
  if (shouldCreateFinancialRecord) {
    await tx.financialRecord.create({
      data: {
        type: 'INCOME',
        amount: totalPrice,
        description: `Pagamento do agendamento - ${(appointment as any).endUser?.name || 'Cliente'}`,
        paymentMethod: paymentMethod,
        reference: appointmentId,
        tenantId: appointment.tenantId,
        date: toLocalISOString(getBrazilNow())
      }
    })
  }

  return appointment
}
