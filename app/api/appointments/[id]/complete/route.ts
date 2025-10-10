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

    // Calcular preço total baseado nos serviços do agendamento
    const totalPrice = existingAppointment.services.reduce((total, service) => {
      return total + Number(service.price || 0)
    }, 0)

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
      const notesText = existingAppointment.notes || ''
      const wantsToUseCredit = /\[USE_CREDIT(?::[^\]]+)?\]/.test(notesText)
      const alreadyDebited = /\[DEBITED_CREDIT:[^\]]+\]/.test(notesText)
      let debitedCreditId: string | null = null
      let shouldCreateFinancialRecord = true

      // Se deve usar crédito e ainda não debitou, procurar e debitar 1 crédito
      if (wantsToUseCredit && !alreadyDebited) {
        // Descobrir serviceId preferido pelo marcador
        const m = notesText.match(/\[USE_CREDIT:([^\]]+)\]/)
        const markerServiceId = m?.[1]
        const serviceIdToConsume = markerServiceId || existingAppointment.services?.[0]?.id

        if (!serviceIdToConsume) {
          throw new Error('Serviço para débito de crédito não identificado')
        }

        const now = new Date()
        // Buscar pacotes do cliente com crédito disponível para o serviço, não expirados
        const packages = await tx.clientPackage.findMany({
          where: {
            clientId: existingAppointment.endUserId,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
            credits: {
              some: {
                serviceId: serviceIdToConsume,
                usedCredits: { lt: undefined as any } // placeholder; será filtrado abaixo
              }
            }
          },
          include: {
            credits: {
              where: { serviceId: serviceIdToConsume },
            }
          }
        })

        // Filtrar com saldo disponível (used < total)
        const withBalance = packages
          .map(p => ({
            pkg: p,
            credit: p.credits.find(c => c.serviceId === serviceIdToConsume && c.usedCredits < c.totalCredits) || null
          }))
          .filter(x => !!x.credit) as { pkg: typeof packages[number]; credit: typeof packages[number]['credits'][number] }[]

        if (withBalance.length === 0) {
          throw new Error('Sem créditos disponíveis para este serviço')
        }

        // Ordenar pelo que expira primeiro (null por último)
        withBalance.sort((a, b) => {
          const ax = a.pkg.expiresAt ? a.pkg.expiresAt.getTime() : Number.POSITIVE_INFINITY
          const bx = b.pkg.expiresAt ? b.pkg.expiresAt.getTime() : Number.POSITIVE_INFINITY
          return ax - bx
        })

        const chosen = withBalance[0]

        // Debitar 1 crédito
        const updatedCredit = await tx.clientPackageCredit.update({
          where: { id: chosen.credit.id },
          data: {
            usedCredits: { increment: 1 }
          }
        })

        debitedCreditId = updatedCredit.id
        shouldCreateFinancialRecord = false // Não criar receita: já reconhecida na venda do pacote
      }

      // Operação 1: Atualizar o Agendamento
      const appointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          paymentMethod: paymentMethod,
          paymentStatus: "PAID",
          completedAt: toLocalISOString(getBrazilNow()), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
          totalPrice: totalPrice, // Atualizar com preço calculado
          commissionEarned: commissionEarned,
          // Marcar consumo de crédito (idempotência)
          notes: debitedCreditId
            ? `${notesText ? notesText + '\n' : ''}[DEBITED_CREDIT:${debitedCreditId}]`
            : notesText
        },
        include: {
          endUser: true,
          professional: true,
          services: true
        }
      })

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
