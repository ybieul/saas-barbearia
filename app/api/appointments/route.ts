import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar agendamentos do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const professionalId = searchParams.get('professionalId')

    const where: any = {
      tenantId: user.tenantId
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      where.dateTime = {
        gte: startDate,
        lte: endDate
      }
    }

    if (status) {
      where.status = status
    }

    if (professionalId && professionalId !== 'todos') {
      where.professionalId = professionalId
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { dateTime: 'asc' },
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        professional: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar agendamento
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      endUserId, 
      serviceId, 
      professionalId, 
      dateTime, 
      notes 
    } = await request.json()

    if (!endUserId || !serviceId || !dateTime) {
      return NextResponse.json(
        { message: 'Cliente, serviço e data/hora são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se cliente, serviço e profissional pertencem ao tenant
    const [client, service, professional] = await Promise.all([
      prisma.endUser.findFirst({
        where: { id: endUserId, tenantId: user.tenantId }
      }),
      prisma.service.findFirst({
        where: { id: serviceId, tenantId: user.tenantId }
      }),
      professionalId ? prisma.professional.findFirst({
        where: { id: professionalId, tenantId: user.tenantId }
      }) : null
    ])

    if (!client) {
      return NextResponse.json(
        { message: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    if (!service) {
      return NextResponse.json(
        { message: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    if (professionalId && !professional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflitos de horário se profissional foi especificado
    if (professionalId) {
      const appointmentDate = new Date(dateTime)
      const endTime = new Date(appointmentDate.getTime() + service.duration * 60000)

      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          professionalId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
          },
          OR: [
            {
              dateTime: {
                lt: endTime
              },
              // Calculando o fim do agendamento existente
              // Precisamos fazer isso via raw query ou buscar e calcular
            }
          ]
        }
      })

      // Simplificado: verificar apenas se já existe agendamento no mesmo horário
      const exactTimeConflict = await prisma.appointment.findFirst({
        where: {
          professionalId,
          dateTime: appointmentDate,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
          }
        }
      })

      if (exactTimeConflict) {
        return NextResponse.json(
          { message: 'Já existe um agendamento neste horário para este profissional' },
          { status: 409 }
        )
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        dateTime: new Date(dateTime),
        duration: service.duration,
        totalPrice: service.price,
        status: 'SCHEDULED',
        notes,
        tenantId: user.tenantId,
        endUserId,
        serviceId,
        professionalId: professionalId || null
      },
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        professional: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    })

    return NextResponse.json({ appointment, message: 'Agendamento criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar agendamento
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      id, 
      endUserId, 
      serviceId, 
      professionalId, 
      dateTime, 
      status, 
      notes,
      paymentMethod,
      paymentStatus
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o agendamento pertence ao tenant
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { message: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Se está sendo marcado como concluído, atualizar dados do cliente
    const updateData: any = {
      endUserId,
      serviceId,
      professionalId: professionalId || null,
      dateTime: dateTime ? new Date(dateTime) : undefined,
      status,
      notes,
      paymentMethod,
      paymentStatus
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        endUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        professional: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    })

    // Atualizar estatísticas do cliente se o agendamento foi concluído
    if (status === 'COMPLETED') {
      const clientStats = await prisma.appointment.aggregate({
        where: {
          endUserId: appointment.endUserId,
          status: 'COMPLETED'
        },
        _count: true,
        _sum: {
          totalPrice: true
        }
      })

      await prisma.endUser.update({
        where: { id: appointment.endUserId },
        data: {
          totalVisits: clientStats._count,
          totalSpent: clientStats._sum.totalPrice || 0,
          lastVisit: new Date()
        }
      })
    }

    return NextResponse.json({ appointment, message: 'Agendamento atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Cancelar/Remover agendamento
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o agendamento pertence ao tenant
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { message: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Em vez de deletar, marcar como cancelado se o agendamento for futuro
    const appointmentDate = new Date(existingAppointment.dateTime)
    const now = new Date()

    if (appointmentDate > now) {
      await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Cancelado pelo sistema'
        }
      })
      return NextResponse.json({ message: 'Agendamento cancelado com sucesso' })
    } else {
      // Agendamentos passados podem ser deletados
      await prisma.appointment.delete({
        where: { id }
      })
      return NextResponse.json({ message: 'Agendamento removido com sucesso' })
    }
  } catch (error) {
    console.error('Erro ao remover agendamento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
