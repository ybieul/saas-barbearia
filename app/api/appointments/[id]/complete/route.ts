import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { finalizeAppointmentCore, maybeSendImmediateFeedback } from "@/lib/finalize-appointment"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentMethod } = await request.json()
    const appointmentId = params.id

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Forma de pagamento é obrigatória' },
        { status: 400 }
      )
    }

    const appointment = await prisma.$transaction(async (tx) => {
      return finalizeAppointmentCore(tx, { appointmentId, paymentMethod })
    })

    // Garantia: disparo imediato de feedback quando delay=0
    try {
      await maybeSendImmediateFeedback(prisma, appointment)
    } catch (_) {
      // não bloquear a conclusão por falha no envio
    }

    return NextResponse.json({
      success: true,
      appointment,
      message: 'Agendamento concluído com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao completar agendamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
