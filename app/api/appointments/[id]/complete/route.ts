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

    // Calcular preço total baseado nos serviços do agendamento
    const totalPrice = existingAppointment.services.reduce((total, service) => {
      return total + Number(service.price || 0)
    }, 0)

    console.log('💰 Calculando preço total na conclusão:', {
      appointmentId,
      servicesCount: existingAppointment.services.length,
      servicesPrices: existingAppointment.services.map(s => ({ name: s.name, price: s.price })),
      totalPrice,
      paymentMethod
    })

    // Atualizar o agendamento com status COMPLETED, forma de pagamento e preço total
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        paymentMethod: paymentMethod,
        paymentStatus: "PAID",
        completedAt: new Date(),
        totalPrice: totalPrice // Atualizar com preço calculado
      },
      include: {
        endUser: true,
        professional: true,
        services: true
      }
    })

    // Criar registro financeiro com o valor calculado
    await prisma.financialRecord.create({
      data: {
        type: "INCOME",
        amount: totalPrice,
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
