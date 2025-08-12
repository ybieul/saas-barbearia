import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBrazilDayOfWeek, getBrazilDayNameEn, debugTimezone, toLocalISOString, parseDatabaseDateTime, getBrazilNow } from '@/lib/timezone'

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
        services: {  // ✅ CORRIGIDO: usar services (plural) para many-to-many
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
      services: serviceIds, // ✅ NOVO: Array de IDs dos serviços
      professionalId, 
      dateTime, 
      notes 
    } = await request.json()

    if (!endUserId || !serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0 || !dateTime) {
      return NextResponse.json(
        { message: 'Cliente, serviços e data/hora são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se cliente, serviços e profissional pertencem ao tenant
    const [client, services, professional] = await Promise.all([
      prisma.endUser.findFirst({
        where: { id: endUserId, tenantId: user.tenantId }
      }),
      prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId: user.tenantId }
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

    if (!services || services.length === 0) {
      return NextResponse.json(
        { message: 'Serviços não encontrados' },
        { status: 404 }
      )
    }

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { message: 'Alguns serviços não foram encontrados' },
        { status: 404 }
      )
    }

    if (professionalId && !professional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO - USANDO APENAS TIMEZONE BRASILEIRO
    const appointmentDate = parseDatabaseDateTime(dateTime) // 🇧🇷 CORREÇÃO: Usar função brasileira
    
    // 🇧🇷 EXPLÍCITO: Sistema brasileiro direto - SEM UTC
    debugTimezone(appointmentDate, 'Agendamento recebido (BRASILEIRO)')
    
    // ✅ PERMITIR agendamentos retroativos no dashboard - comentado para permitir retroagendamento
    // Verificar se a data não é no passado (USANDO APENAS TIMEZONE BRASILEIRO)
    // const nowBrazil = getBrazilNow() // 🇧🇷 CORREÇÃO: Usar função brasileira
    // if (appointmentDate < nowBrazil) {
    //   return NextResponse.json(
    //     { message: 'Não é possível agendar em datas/horários passados' },
    //     { status: 400 }
    //   )
    // }
    
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
    
    // 🇧🇷 NOVO: Obter dia da semana diretamente (sem conversão UTC)
    const dayOfWeek = getBrazilDayOfWeek(appointmentDate)
    const dayName = getBrazilDayNameEn(appointmentDate)
    
    console.log('🇧🇷 Validação de dia:', {
      appointmentDate: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
      dayOfWeek,
      dayName
    })
    
    // Buscar configuração do dia específico
    const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName)
    
    if (!dayConfig || !dayConfig.isActive) {
      const dayNamePt = appointmentDate.toLocaleDateString('pt-BR', { weekday: 'long' })
      return NextResponse.json(
        { message: `Estabelecimento fechado ${dayNamePt}. Escolha outro dia.` },
        { status: 400 }
      )
    }
    
    // 🇧🇷 NOVO: Verificar se horário está dentro do funcionamento (direto)
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

    // Calcular duração e preço totais
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0)

    // Verificar conflitos de horário se profissional foi especificado
    if (professionalId) {
      const endTime = new Date(appointmentDate.getTime() + totalDuration * 60000)

      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          professionalId,
          status: {
            in: ['CONFIRMED', 'IN_PROGRESS']
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

      // 🇧🇷 NOVO: Buscar todos os agendamentos do dia (direto)
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
            in: ['CONFIRMED', 'IN_PROGRESS']
          }
        },
        include: {
          services: {
            select: { duration: true }
          }
        }
      })
      
      // Verificar sobreposição de horários - USANDO ACESSO DIRETO AO DATE OBJECT
      for (const existing of dayAppointments) {
        const existingStart = existing.dateTime // 🇧🇷 CORREÇÃO FINAL: Usar Date object direto do Prisma
        const existingDuration = existing.duration || existing.services?.[0]?.duration || 30
        const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000)
        
        // Verificar se há sobreposição
        if ((appointmentDate < existingEnd) && (endTime > existingStart)) {
          return NextResponse.json(
            { message: 'Conflito de horário detectado. Este horário já está ocupado.' },
            { status: 409 }
          )
        }
      }
    }

    // 🇧🇷 FINAL: Salvar usando string ISO brasileira - NUNCA Date object para evitar conversão UTC do Prisma
    const dateTimeForSave = toLocalISOString(appointmentDate)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🇧🇷 DEBUG SALVAMENTO NO BANCO:', {
        originalDateTime: dateTime,
        parsedDate: appointmentDate,
        stringForSave: dateTimeForSave,
        timezone: 'BRASILEIRO - SEM UTC'
      })
    }
    
    const newAppointment = await prisma.appointment.create({
      data: {
        dateTime: dateTimeForSave, // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
        duration: totalDuration,
        totalPrice: totalPrice,
        status: 'CONFIRMED',
        notes,
        tenantId: user.tenantId,
        endUserId,
        professionalId: professionalId || null,
        // ✅ NOVO: Conectar múltiplos serviços
        services: {
          connect: serviceIds.map(id => ({ id }))
        }
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
        services: {
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

    return NextResponse.json({ appointment: newAppointment, message: 'Agendamento criado com sucesso' })
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
      services: serviceIds, // ✅ NOVO: Array de IDs dos serviços
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

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO (apenas se dateTime está sendo alterado) - USANDO APENAS TIMEZONE BRASILEIRO
    if (dateTime) {
      const appointmentDate = parseDatabaseDateTime(dateTime) // 🇧🇷 CORREÇÃO: Usar função brasileira
      
      // 🇧🇷 EXPLÍCITO: Sistema brasileiro direto - SEM UTC
      debugTimezone(appointmentDate, 'Update de agendamento recebido (BRASILEIRO)')
      
      // ✅ PERMITIR agendamentos retroativos no dashboard - comentado para permitir retroagendamento
      // Verificar se a data não é no passado (usando APENAS timezone brasileiro)
      // const nowBrazil = getBrazilNow() // 🇧🇷 CORREÇÃO: Usar função brasileira
      // if (appointmentDate < nowBrazil) {
      //   return NextResponse.json(
      //     { message: 'Não é possível agendar em datas/horários passados' },
      //     { status: 400 }
      //   )
      // }
      
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
      
      // 🇧🇷 CORREÇÃO: Obter dia da semana no timezone brasileiro
      const dayOfWeek = getBrazilDayOfWeek(appointmentDate)
      const dayName = getBrazilDayNameEn(appointmentDate)
      
      console.log('🇧🇷 Validação de dia (UPDATE):', {
        appointmentDate: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
        appointmentBrazil: appointmentDate.toString(),
        dayOfWeek,
        dayName
      })
      
      // Buscar configuração do dia específico
      const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName)
      
      if (!dayConfig || !dayConfig.isActive) {
        const dayNamePt = appointmentDate.toLocaleDateString('pt-BR', { weekday: 'long' })
        return NextResponse.json(
          { message: `Estabelecimento fechado ${dayNamePt}. Escolha outro dia.` },
          { status: 400 }
        )
      }
      
      // 🇧🇷 CORREÇÃO: Verificar se horário está dentro do funcionamento (timezone brasileiro)
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
        // Obter dados dos serviços para calcular duração
        let totalDuration = 0
        
        if (serviceIds && Array.isArray(serviceIds)) {
          // Novos serviços sendo definidos
          const newServices = await prisma.service.findMany({
            where: { id: { in: serviceIds }, tenantId: user.tenantId }
          })
          if (newServices.length !== serviceIds.length) {
            return NextResponse.json(
              { message: 'Alguns serviços não foram encontrados' },
              { status: 404 }
            )
          }
          totalDuration = newServices.reduce((sum, s) => sum + s.duration, 0)
        } else {
          // Manter serviços existentes
          const currentAppointment = await prisma.appointment.findFirst({
            where: { id, tenantId: user.tenantId },
            include: { services: { select: { duration: true } } }
          })
          if (!currentAppointment) {
            return NextResponse.json(
              { message: 'Agendamento não encontrado' },
              { status: 404 }
            )
          }
          totalDuration = currentAppointment.services.reduce((sum, s) => sum + s.duration, 0)
        }
        
        const endTime = new Date(appointmentDate.getTime() + totalDuration * 60000)
        
        // 🇧🇷 CORREÇÃO: Buscar todos os agendamentos do dia (horário brasileiro)
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
              in: ['CONFIRMED', 'IN_PROGRESS']
            },
            id: {
              not: id // Excluir o próprio agendamento
            }
          },
          include: {
            services: {
              select: { duration: true }
            }
          }
        })
        
        // Verificar sobreposição de horários
        for (const existing of dayAppointments) {
          const existingStart = existing.dateTime // 🇧🇷 CORREÇÃO FINAL: Usar Date object direto do Prisma
          const existingDuration = existing.duration || existing.services?.[0]?.duration || 30
          const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000)
          
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

    // 🇧🇷 CORREÇÃO: Preparar dados de update - só incluir campos que foram fornecidos
    const updateData: any = {
      status
    }

    // ✅ CORREÇÃO: Só atualizar campos se fornecidos, caso contrário manter os existentes
    if (endUserId !== undefined) {
      updateData.endUserId = endUserId
    }
    if (professionalId !== undefined) {
      updateData.professionalId = professionalId || null
    }
    if (dateTime !== undefined) {
      updateData.dateTime = toLocalISOString(parseDatabaseDateTime(dateTime)) // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod
    }
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus
    }

    // Atualizar serviços se fornecidos
    if (serviceIds && Array.isArray(serviceIds)) {
      // Verificar se todos os serviços existem
      const newServices = await prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId: user.tenantId }
      })
      
      if (newServices.length !== serviceIds.length) {
        return NextResponse.json(
          { message: 'Alguns serviços não foram encontrados' },
          { status: 404 }
        )
      }
      
      // Calcular novos totais
      const newTotalDuration = newServices.reduce((sum, s) => sum + s.duration, 0)
      const newTotalPrice = newServices.reduce((sum, s) => sum + Number(s.price), 0)
      
      updateData.duration = newTotalDuration
      updateData.totalPrice = newTotalPrice
      updateData.services = {
        set: serviceIds.map(id => ({ id }))
      }
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
        services: {
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
          lastVisit: toLocalISOString(getBrazilNow()) // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
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

    // Verificar se o agendamento pertence ao tenant e buscar dados completos
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      },
      include: {
        endUser: true,
        services: true
      }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { message: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // ✅ USAR TRANSAÇÃO PARA REVERTER DADOS AGREGADOS
    await prisma.$transaction(async (tx) => {
      // Se agendamento estava COMPLETED, reverter dados do cliente
      if (existingAppointment.status === 'COMPLETED') {
        const totalPrice = existingAppointment.totalPrice || 0

        console.log('🔄 Revertendo dados do cliente:', {
          appointmentId: id,
          clientId: existingAppointment.endUserId,
          clientName: existingAppointment.endUser.name,
          totalPrice,
          status: existingAppointment.status
        })

        // Decrementar dados agregados do cliente
        await tx.endUser.update({
          where: { id: existingAppointment.endUserId },
          data: {
            totalVisits: {
              decrement: 1, // Decrementar número de visitas
            },
            totalSpent: {
              decrement: totalPrice, // Decrementar gasto total
            },
          },
        })

        // Recalcular lastVisit (buscar último agendamento concluído restante)
        const lastCompletedAppointment = await tx.appointment.findFirst({
          where: {
            endUserId: existingAppointment.endUserId,
            status: 'COMPLETED',
            id: { not: id }, // Excluir o agendamento que será deletado
          },
          orderBy: { completedAt: 'desc' },
        })

        // Atualizar lastVisit
        await tx.endUser.update({
          where: { id: existingAppointment.endUserId },
          data: {
            lastVisit: lastCompletedAppointment?.completedAt || null,
          },
        })

        // Remover FinancialRecord associado
        await tx.financialRecord.deleteMany({
          where: {
            reference: id,
            tenantId: user.tenantId,
          },
        })

        console.log('✅ Dados do cliente revertidos com sucesso')
      }

      // Deletar o agendamento
      await tx.appointment.delete({
        where: { id }
      })
    })
    
    return NextResponse.json({ message: 'Agendamento excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao remover agendamento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
