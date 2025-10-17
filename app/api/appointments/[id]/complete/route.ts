import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBrazilNow, toLocalISOString } from "@/lib/timezone"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  const { paymentMethod } = await request.json()
    const appointmentId = params.id

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Forma de pagamento é obrigatória" },
        { status: 400 }
      )
    }

    // Verificar se o agendamento existe
    // ✅ CORREÇÃO: Usar select para incluir tenantId explicitamente
    // Sem isso, existingAppointment.tenantId é undefined, causando erro SQL na verificação de assinatura
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        endUserId: true,
        professionalId: true,
        tenantId: true,
        dateTime: true,
        status: true,
        notes: true,
        totalPrice: true,
        duration: true,
        completedAt: true,
        endUser: {
          select: {
            id: true,
            name: true,
            totalVisits: true,
            totalSpent: true,
            lastVisit: true
          }
        },
        professional: {
          select: {
            id: true,
            name: true,
            commissionPercentage: true
          }
        },
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true
          }
        }
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      )
    }

    // Calcular preço total baseado nos serviços do agendamento (base)
    // Usar o total salvo como fonte primária; fallback para soma dos serviços
    let totalPrice = Number(existingAppointment.totalPrice || 0)
    if (!totalPrice || totalPrice <= 0) {
      totalPrice = existingAppointment.services.reduce((total, service) => total + Number(service.price || 0), 0)
    }

    // Calcular comissão do profissional (snapshot)
    let commissionEarned = null as number | null
    const commissionPct = existingAppointment.professional?.commissionPercentage
    if (commissionPct !== null && commissionPct !== undefined) {
      // commissionPercentage armazenado como fração (ex: 0.4 = 40%)
      const pct = Number(commissionPct)
      if (!isNaN(pct) && pct > 0) {
        commissionEarned = Number((totalPrice * pct).toFixed(2))
      }
    }

  // ✅ TRANSAÇÃO PARA GARANTIR A INTEGRIDADE (appointment + cliente + financeiro + créditos)
  const updatedAppointment = await prisma.$transaction(async (tx) => {
      // Observação do cliente (sem marcadores técnicos)
      const originalNotes = (existingAppointment.notes || '').toString()
        .replace(/\[(?:USE_CREDIT(?:_SERVICES|_PACKAGE)?|DEBITED_(?:CREDIT|PACKAGE)|SUBSCRIPTION_COVERED|PACKAGE_(?:COVERED|ELIGIBLE))(?:[^\]]*)\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()

      // Intenção de usar crédito: baseada na escolha do modal (PREPAID)
      const wantsToUseCredit = paymentMethod === 'PREPAID'
      const alreadyDebited = false // não persistimos mais markers em notes
      const subscriptionMarkerMatch = null // não usamos marker salvo em notes
      const hasSubscriptionMarker = !!subscriptionMarkerMatch
      // Flag para marcar cobertura por assinatura detectada nesta transação
      let subscriptionCovered = false
      let debitedCreditId: string | null = null
      let debitedPackageId: string | null = null
      let shouldCreateFinancialRecord = true

      // Se já houver marker de assinatura, priorizar como pré-pago (sem financeiro)
      if (hasSubscriptionMarker) {
        shouldCreateFinancialRecord = false
      }

      // ✅ CRÍTICO: Só verificar cobertura se usuário escolheu PREPAID
      // Se escolheu CASH/PIX/CARD, mesmo tendo assinatura, ele QUER pagar normalmente
      const serviceIdsSelected = existingAppointment.services.map(s => s.id)
      const now = new Date()
      
      if (wantsToUseCredit && !hasSubscriptionMarker) {
        // Verificar cobertura por assinatura de forma determinística via SQL
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
            const ids = [...new Set(planRows.map(r => r.planId))]
            const placeholders = ids.map(() => '?').join(',')
            const allowed = await tx.$queryRawUnsafe<Array<{ planId: string, serviceId: string }>>(
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
                // Assinatura cobre todo o combo selecionado
                subscriptionCovered = true
                // Mantemos o totalPrice original para métricas/relatórios e comissão
                // A baixa financeira é evitada via shouldCreateFinancialRecord = false
                shouldCreateFinancialRecord = false
                break
              }
            }
          }
        } catch (error) {
          throw error
        }
      }

      // Se deve usar crédito e ainda não debitou (e não foi coberto por assinatura), procurar e debitar pacote
  if (wantsToUseCredit && !alreadyDebited && !subscriptionCovered) {
        const servicesSelected = existingAppointment.services.map(s => s.id)
  // Não usamos mais marcadores vindos das notas; faremos detecção automática por combo elegível
  const usePackageMarker = null
  const csvMarker = null
  const markerPackageId = usePackageMarker?.[1] || null

        const now = new Date()

        if (markerPackageId) {
          // Validar e debitar do pacote marcado
          const pkg = await tx.clientPackage.findFirst({
            where: { id: markerPackageId, clientId: existingAppointment.endUserId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { id: true, purchasedAt: true, expiresAt: true }
          })
          if (!pkg) throw new Error('Pacote marcado não encontrado ou expirado')
          const allowedRows = await tx.$queryRaw<Array<{ serviceId: string }>>`
            SELECT serviceId FROM client_package_allowed_services WHERE clientPackageId = ${pkg.id}
          `
          const allowed = allowedRows.map((s) => s.serviceId)
          if (allowed.length !== servicesSelected.length) throw new Error('Combo do pacote não coincide com os serviços do agendamento')
          const allowedSet = new Set(allowed)
          for (const id of servicesSelected) { if (!allowedSet.has(id)) throw new Error('Combo do pacote não coincide com os serviços do agendamento') }
          const pkgRow = (await tx.$queryRaw<Array<{ creditsTotal: number, usedCredits: number }>>`
            SELECT creditsTotal, usedCredits FROM client_packages WHERE id = ${pkg.id} LIMIT 1
          `)[0]
          if (!pkgRow || (pkgRow.creditsTotal - pkgRow.usedCredits) <= 0) throw new Error('Pacote sem saldo disponível')
          await tx.$executeRaw`
            UPDATE client_packages SET usedCredits = usedCredits + 1 WHERE id = ${pkg.id}
          `
          debitedPackageId = pkg.id
          shouldCreateFinancialRecord = false
        } else {
          // Encontrar pacote elegível por combo exato (detecção automática)
          const packagesBase = await tx.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
            SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
            FROM client_packages
            WHERE clientId = ${existingAppointment.endUserId}
              AND (expiresAt IS NULL OR expiresAt > ${now})
          `
          let allowedRows2: Array<{ clientPackageId: string, serviceId: string }> = []
          if (packagesBase.length > 0) {
            const ids = packagesBase.map(p => p.id)
            const placeholders = ids.map(() => '?').join(',')
            allowedRows2 = await tx.$queryRawUnsafe(
              `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
              ...ids
            )
          }
          const allowedMap2 = new Map<string, string[]>()
          for (const row of allowedRows2) {
            const arr = allowedMap2.get(row.clientPackageId) || []
            arr.push(row.serviceId)
            allowedMap2.set(row.clientPackageId, arr)
          }
          const packages = packagesBase
          const withRemaining = packages.filter(p => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)
          const eligible = withRemaining.filter(p => {
            const allowed = allowedMap2.get(p.id) || []
            if (allowed.length !== servicesSelected.length) return false
            const allowedSet = new Set(allowed)
            for (const id of servicesSelected) { if (!allowedSet.has(id)) return false }
            return true
          })
          if (eligible.length === 0) throw new Error('Nenhum pacote elegível encontrado para o combo exato')
          eligible.sort((a, b) => {
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

        // Compatibilidade legado: se por algum motivo não achamos pacote por combo, tentar por serviço específico
        if (!debitedPackageId) {
          const serviceIdToConsume = servicesSelected[0]
          if (!serviceIdToConsume) throw new Error('Serviço para débito de crédito não identificado')

          const packages = await tx.clientPackage.findMany({
            where: {
              clientId: existingAppointment.endUserId,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            include: {
              credits: { where: { serviceId: serviceIdToConsume } }
            }
          })
          const withBalance = packages
            .map(p => ({ pkg: p, credit: p.credits.find(c => c.serviceId === serviceIdToConsume && c.usedCredits < c.totalCredits) || null }))
            .filter(x => !!x.credit) as { pkg: typeof packages[number]; credit: typeof packages[number]['credits'][number] }[]
          if (withBalance.length === 0) throw new Error('Sem créditos disponíveis para este serviço')
          withBalance.sort((a, b) => {
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

      // Operação 1: Atualizar o Agendamento
      // ✅ PREPAID faz parte do enum - indica pagamento via assinatura/pacote
      // PaymentSource indica especificamente SUBSCRIPTION ou PACKAGE
      const finalPaymentMethod = paymentMethod
      
  const appointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          paymentMethod: finalPaymentMethod, // ✅ PREPAID quando coberto por assinatura/pacote
          paymentStatus: "PAID",
          completedAt: toLocalISOString(getBrazilNow()), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
          totalPrice: totalPrice, // Mantém preço original no banco
          commissionEarned: commissionEarned,
          // Marcar consumo de crédito (idempotência)
          // Salvar apenas a observação do cliente, sem marcadores técnicos
          notes: originalNotes || null
        },
        include: {
          endUser: true,
          professional: true,
          services: true
        }
      })

      // Indicar fonte do pagamento quando pré-pago (SQL direto para evitar conflito de tipos locais do Prisma)
      const source = (hasSubscriptionMarker || subscriptionCovered) ? 'SUBSCRIPTION' : (debitedPackageId || debitedCreditId ? 'PACKAGE' : null)
      
      if (source) {
        await tx.$executeRaw`UPDATE appointments SET paymentSource = ${source} WHERE id = ${appointmentId}`
      }

      // Calcular e persistir discountApplied com base na fonte
      try {
        let discount = 0
        
        if (source === 'SUBSCRIPTION') {
          // Assinatura cobre 100% do valor do agendamento
          discount = Number(totalPrice || 0)
        } else if (source === 'PACKAGE') {
          // Pacote também é pré-pago: zera o valor do agendamento
          // Regra simplificada alinhada à expectativa do negócio
          discount = Number(totalPrice || 0)
        }
        // Persistir snapshot do desconto
        if (!isNaN(discount) && discount > 0) {
          await tx.$executeRaw`UPDATE appointments SET discountApplied = ${discount} WHERE id = ${appointmentId}`
        }
      } catch (e) {
        // Não falhar a transação por causa do desconto; apenas logar
        console.warn('Falha ao calcular discountApplied para agendamento', appointmentId, e)
      }

      // Operação 2: Atualizar os dados agregados do Cliente
      await tx.endUser.update({
        where: { id: existingAppointment.endUserId },
        data: {
          totalVisits: {
            increment: 1, // Incrementa o número de visitas
          },
          totalSpent: {
            increment: totalPrice, // Incrementa o gasto total
          },
          lastVisit: toLocalISOString(getBrazilNow()), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
        },
      })

      // Operação 3: Criar registro financeiro apenas se NÃO houve uso de crédito
      if (shouldCreateFinancialRecord) {
        await tx.financialRecord.create({
          data: {
            type: "INCOME",
            amount: totalPrice,
            description: `Pagamento do agendamento - ${existingAppointment.endUser.name}`,
            paymentMethod: finalPaymentMethod,
            reference: appointmentId,
            tenantId: appointment.tenantId,
            date: toLocalISOString(getBrazilNow()) // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
          }
        })
      }

      // Operação 4 (opcional futura): Poder criar um registro separado de comissão a pagar (liability) se modelo exigir

      return appointment
    })

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: "Agendamento concluído com sucesso!"
    })

  } catch (error) {
    console.error("Erro ao completar agendamento:", error)
    
    return NextResponse.json(
      { error: "Erro interno do servidor: " + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    )
  }
}
