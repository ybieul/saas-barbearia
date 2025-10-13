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
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        endUser: true,
        professional: true,
        services: true
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

    console.log('💰 Calculando preço total na conclusão:', {
      appointmentId,
      servicesCount: existingAppointment.services.length,
      servicesPrices: existingAppointment.services.map(s => ({ name: s.name, price: s.price })),
      totalPrice,
      paymentMethod,
      clientId: existingAppointment.endUserId,
      clientName: existingAppointment.endUser.name
    })

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
      // Detectar intenção de uso de crédito e se já foi debitado
      let notesText = existingAppointment.notes || ''
      // Se usuário escolheu PREPAID no modal, forçar intenção de usar crédito caso ainda não exista marcador
      if (paymentMethod === 'PREPAID' && !(/\[USE_CREDIT(?::[^\]]+)?\]/.test(notesText) || /\[USE_CREDIT_SERVICES:[^\]]+\]/.test(notesText))) {
        notesText = `${notesText ? notesText + '\n' : ''}[USE_CREDIT]`
      }
      const wantsToUseCredit = /\[USE_CREDIT(?::[^\]]+)?\]/.test(notesText) || /\[USE_CREDIT_SERVICES:[^\]]+\]/.test(notesText)
      const alreadyDebited = /\[(DEBITED_CREDIT|DEBITED_PACKAGE):[^\]]+\]/.test(notesText)
      const subscriptionMarkerMatch = notesText.match(/\[SUBSCRIPTION_COVERED:([^\]]+)\]/)
      const hasSubscriptionMarker = !!subscriptionMarkerMatch
  let debitedCreditId: string | null = null
  let debitedPackageId: string | null = null
      let shouldCreateFinancialRecord = true

      // Se já houver marker de assinatura, priorizar como pré-pago (sem financeiro)
      if (hasSubscriptionMarker) {
        shouldCreateFinancialRecord = false
      }

      // Verificar cobertura por assinatura de forma determinística via SQL (baseada na lógica de pacotes)
  const serviceIdsSelected = existingAppointment.services.map(s => s.id)
      const now = new Date()
      if (!hasSubscriptionMarker) {
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
                totalPrice = 0
                shouldCreateFinancialRecord = false
                break
              }
            }
          }
        } catch {}
      }

      // Se deve usar crédito e ainda não debitou, procurar e debitar 1 crédito
  if (wantsToUseCredit && !alreadyDebited) {
        const servicesSelected = existingAppointment.services.map(s => s.id)
        const usePackageMarker = notesText.match(/\[USE_CREDIT_PACKAGE:([^\]]+)\]/)
        const csvMarker = notesText.match(/\[USE_CREDIT_SERVICES:([^\]]+)\]/)
        const markerPackageId = usePackageMarker?.[1] || null
        const markerServicesCsv = csvMarker?.[1] || null

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
        } else if (markerServicesCsv) {
          // Encontrar pacote elegível por combo exato
          const markerServices = markerServicesCsv.split(',').filter(Boolean)
          // Validar que os serviços atuais ainda batem com o marcador
          if (markerServices.length !== servicesSelected.length) throw new Error('Combo selecionado mudou e não coincide com o marcador')
          const markerSet = new Set(markerServices)
          for (const id of servicesSelected) { if (!markerSet.has(id)) throw new Error('Combo selecionado mudou e não coincide com o marcador') }

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
        } else {
          // Compatibilidade legado: consumo por serviço específico
          const m = notesText.match(/\[USE_CREDIT:([^\]]+)\]/)
          const markerServiceId = m?.[1]
          const serviceIdToConsume = markerServiceId || servicesSelected[0]
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
  const appointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          paymentMethod: paymentMethod,
          paymentStatus: "PAID",
          completedAt: toLocalISOString(getBrazilNow()), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
          totalPrice: totalPrice, // Mantém preço original no banco
          commissionEarned: commissionEarned,
          // Marcar consumo de crédito (idempotência)
          notes: debitedPackageId
            ? `${notesText ? notesText + '\n' : ''}[DEBITED_PACKAGE:${debitedPackageId}]`
            : (debitedCreditId
              ? `${notesText ? notesText + '\n' : ''}[DEBITED_CREDIT:${debitedCreditId}]`
              : notesText)
        },
        include: {
          endUser: true,
          professional: true,
          services: true
        }
      })

      // Indicar fonte do pagamento quando pré-pago (SQL direto para evitar conflito de tipos locais do Prisma)
      const source = hasSubscriptionMarker ? 'SUBSCRIPTION' : (debitedPackageId || debitedCreditId ? 'PACKAGE' : null)
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
          // Estimar custo alocado do crédito usado
          // Regra: custo por crédito = (preço total do pacote / créditos totais do pacote)
          // Quando temos debitedPackageId, usar esse pacote; caso contrário (legado crédito por serviço), aplicar desconto total
          if (debitedPackageId) {
            try {
              const rows = await tx.$queryRaw<Array<{ totalPrice: any, creditsTotal: any }>>`
                SELECT p.totalPrice as totalPrice, cp.creditsTotal as creditsTotal
                FROM client_packages cp
                JOIN service_packages p ON p.id = cp.packageId
                WHERE cp.id = ${debitedPackageId}
                LIMIT 1
              `
              if (rows && rows.length > 0) {
                const packTotal = Number(rows[0].totalPrice || 0)
                const creditsTotal = Number(rows[0].creditsTotal || 0)
                const costPerCredit = creditsTotal > 0 ? (packTotal / creditsTotal) : 0
                const full = Number(totalPrice || 0)
                discount = Math.max(0, Number((full - costPerCredit).toFixed(2)))
              } else {
                // fallback se não encontrou: considerar desconto total
                discount = Number(totalPrice || 0)
              }
            } catch {
              discount = Number(totalPrice || 0)
            }
          } else if (debitedCreditId) {
            // caminho legado (por serviço): tratar como pré-pago total
            discount = Number(totalPrice || 0)
          }
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
            paymentMethod: paymentMethod,
            reference: appointmentId,
            tenantId: appointment.tenantId,
            date: toLocalISOString(getBrazilNow()) // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
          }
        })
      }

      // Operação 4 (opcional futura): Poder criar um registro separado de comissão a pagar (liability) se modelo exigir

      return appointment
    })

    console.log('✅ Transação concluída com sucesso:', {
      appointmentId,
      totalPrice,
      commissionEarned,
      commissionPct: commissionPct?.toString(),
      clientUpdated: existingAppointment.endUserId,
      message: 'Cliente atualizado: +1 visita, +' + totalPrice + ' gasto total'
    })

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: "Agendamento concluído com sucesso!"
    })

  } catch (error) {
    console.error("Erro ao concluir agendamento:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
