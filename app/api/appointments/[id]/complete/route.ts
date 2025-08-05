import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Atualizar o agendamento com status COMPLETED e forma de pagamento
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        paymentMethod: paymentMethod,
        paymentStatus: "PAID",
        completedAt: new Date()
      },
      include: {
        endUser: true,
        professional: true,
        services: true
      }
    })

    // Opcional: Criar registro financeiro
    await prisma.financialRecord.create({
      data: {
        type: "INCOME",
        amount: updatedAppointment.totalPrice,
        description: `Pagamento do agendamento - ${existingAppointment.endUser.name}`,
        paymentMethod: paymentMethod,
        reference: appointmentId,
        tenantId: updatedAppointment.tenantId,
        date: new Date()
      }
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
