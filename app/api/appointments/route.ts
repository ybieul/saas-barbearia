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

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO
    const appointmentDate = new Date(dateTime)
    
    // Verificar se a data não é no passado
    const now = new Date()
    if (appointmentDate < now) {
      return NextResponse.json(
        { message: 'Não é possível agendar em datas/horários passados' },
        { status: 400 }
      )
    }
    
    // Obter horários de funcionamento do estabelecimento
    const workingHours = await prisma.workingHours.findMany({
      where: { tenantId: user.tenantId }
    })
    
    if (!workingHours || workingHours.length === 0) {
      return NextResponse.json(
        { message: 'Horários de funcionamento não configurados' },
        { status: 400 }
      )
    }
    
    // Obter dia da semana (0 = domingo, 1 = segunda, etc.)
    const dayOfWeek = appointmentDate.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    
    // Buscar configuração do dia específico
    const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName)
    
    if (!dayConfig || !dayConfig.isActive) {
      const dayNamePt = appointmentDate.toLocaleDateString('pt-BR', { weekday: 'long' })
      return NextResponse.json(
        { message: `Estabelecimento fechado ${dayNamePt}. Escolha outro dia.` },
        { status: 400 }
      )
    }
    
    // Verificar se horário está dentro do funcionamento
    const appointmentTime = appointmentDate.toTimeString().substring(0, 5) // HH:MM
    const startTime = dayConfig.startTime
    const endTime = dayConfig.endTime
    
    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return NextResponse.json(
        { message: `Horário fora do funcionamento. Horário disponível: ${startTime} às ${endTime}` },
        { status: 400 }
      )
    }
    
    console.log(`✅ Validação de horário aprovada: ${appointmentTime} está entre ${startTime} e ${endTime}`)

    // Verificar conflitos de horário se profissional foi especificado
    if (professionalId) {
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

      // Verificação mais robusta: buscar todos os agendamentos do dia
      const dayStart = new Date(appointmentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(appointmentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayAppointments = await prisma.appointment.findMany({
        where: {
          professionalId,
          dateTime: {
            gte: dayStart,
            lte: dayEnd
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
          }
        },
        include: {
          service: {
            select: { duration: true }
          }
        }
      })
      
      // Verificar sobreposição de horários
      for (const existing of dayAppointments) {
        const existingStart = new Date(existing.dateTime)
        const existingEnd = new Date(existingStart.getTime() + (existing.service?.duration || existing.duration || 30) * 60000)
        
        // Verificar se há sobreposição
        if ((appointmentDate < existingEnd) && (endTime > existingStart)) {
          return NextResponse.json(
            { message: 'Conflito de horário detectado. Este horário já está ocupado.' },
            { status: 409 }
          )
        }
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

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO (apenas se dateTime está sendo alterado)
    if (dateTime) {
      const appointmentDate = new Date(dateTime)
      
      // Verificar se a data não é no passado
      const now = new Date()
      if (appointmentDate < now) {
        return NextResponse.json(
          { message: 'Não é possível agendar em datas/horários passados' },
          { status: 400 }
        )
      }
      
      // Obter horários de funcionamento do estabelecimento
      const workingHours = await prisma.workingHours.findMany({
        where: { tenantId: user.tenantId }
      })
      
      if (!workingHours || workingHours.length === 0) {
        return NextResponse.json(
          { message: 'Horários de funcionamento não configurados' },
          { status: 400 }
        )
      }
      
      // Obter dia da semana (0 = domingo, 1 = segunda, etc.)
      const dayOfWeek = appointmentDate.getDay()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[dayOfWeek]
      
      // Buscar configuração do dia específico
      const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName)
      
      if (!dayConfig || !dayConfig.isActive) {
        const dayNamePt = appointmentDate.toLocaleDateString('pt-BR', { weekday: 'long' })
        return NextResponse.json(
          { message: `Estabelecimento fechado ${dayNamePt}. Escolha outro dia.` },
          { status: 400 }
        )
      }
      
      // Verificar se horário está dentro do funcionamento
      const appointmentTime = appointmentDate.toTimeString().substring(0, 5) // HH:MM
      const startTime = dayConfig.startTime
      const endTime = dayConfig.endTime
      
      if (appointmentTime < startTime || appointmentTime >= endTime) {
        return NextResponse.json(
          { message: `Horário fora do funcionamento. Horário disponível: ${startTime} às ${endTime}` },
          { status: 400 }
        )
      }
      
      console.log(`✅ Validação de horário (UPDATE) aprovada: ${appointmentTime} está entre ${startTime} e ${endTime}`)
      
      // Verificar conflitos de horário (apenas se professionalId está sendo alterado ou mantido)
      const finalProfessionalId = professionalId !== undefined ? professionalId : existingAppointment.professionalId
      
      if (finalProfessionalId) {
        // Obter dados do serviço para calcular duração
        const service = serviceId 
          ? await prisma.service.findFirst({ where: { id: serviceId, tenantId: user.tenantId }})
          : await prisma.service.findFirst({ where: { id: existingAppointment.serviceId, tenantId: user.tenantId }})
        
        if (!service) {
          return NextResponse.json(
            { message: 'Serviço não encontrado' },
            { status: 404 }
          )
        }
        
        const endTime = new Date(appointmentDate.getTime() + service.duration * 60000)
        
        // Verificação robusta: buscar todos os agendamentos do dia
        const dayStart = new Date(appointmentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(appointmentDate)
        dayEnd.setHours(23, 59, 59, 999)
        
        const dayAppointments = await prisma.appointment.findMany({
          where: {
            professionalId: finalProfessionalId,
            dateTime: {
              gte: dayStart,
              lte: dayEnd
            },
            status: {
              in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
            },
            id: {
              not: id // Excluir o próprio agendamento
            }
          },
          include: {
            service: {
              select: { duration: true }
            }
          }
        })
        
        // Verificar sobreposição de horários
        for (const existing of dayAppointments) {
          const existingStart = new Date(existing.dateTime)
          const existingEnd = new Date(existingStart.getTime() + (existing.service?.duration || existing.duration || 30) * 60000)
          
          // Verificar se há sobreposição
          if ((appointmentDate < existingEnd) && (endTime > existingStart)) {
            return NextResponse.json(
              { message: 'Conflito de horário detectado. Este horário já está ocupado.' },
              { status: 409 }
            )
          }
        }
      }
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
