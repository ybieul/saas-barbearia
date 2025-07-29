import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getBrazilDayOfWeek, getBrazilDayNameEn, utcToBrazil, debugTimezone } from '@/lib/timezone'

// POST - Criar agendamento público
export async function POST(request: NextRequest) {
  try {
    const {
      businessSlug,
      clientName,
      clientPhone,
      clientEmail,
      professionalId,
      serviceId,
      appointmentDateTime,
      notes
    } = await request.json()

    // Validações básicas
    if (!businessSlug || !clientName || !clientPhone || !serviceId || !appointmentDateTime) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: businessSlug, clientName, clientPhone, serviceId, appointmentDateTime' },
        { status: 400 }
      )
    }

    // Buscar tenant por slug
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: businessSlug },
          { email: businessSlug }
        ],
        isActive: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Buscar ou criar cliente
    let client = await prisma.endUser.findFirst({
      where: {
        tenantId: business.id,
        phone: clientPhone
      }
    })

    if (!client) {
      // Criar novo cliente
      client = await prisma.endUser.create({
        data: {
          tenantId: business.id,
          name: clientName,
          phone: clientPhone,
          email: clientEmail || null,
          notes: notes || null
        }
      })
    } else {
      // Atualizar dados do cliente existente se necessário
      if (client.name !== clientName || client.email !== clientEmail) {
        client = await prisma.endUser.update({
          where: { id: client.id },
          data: {
            name: clientName,
            email: clientEmail || client.email,
            notes: notes || client.notes
          }
        })
      }
    }

    // Buscar serviço e profissional (se especificado)
    const [service, professional] = await Promise.all([
      prisma.service.findFirst({
        where: { id: serviceId, tenantId: business.id }
      }),
      professionalId ? prisma.professional.findFirst({
        where: { id: professionalId, tenantId: business.id }
      }) : null
    ])

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

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO (mesmo sistema do dashboard)
    const appointmentUTC = new Date(appointmentDateTime)
    
    // 🇧🇷 CORREÇÃO: Converter para timezone brasileiro antes de qualquer validação
    const appointmentBrazil = utcToBrazil(appointmentUTC)
    debugTimezone(appointmentUTC, 'Agendamento público recebido')
    
    // Verificar se a data não é no passado (usando timezone brasileiro)
    const nowBrazil = utcToBrazil(new Date())
    if (appointmentBrazil < nowBrazil) {
      return NextResponse.json(
        { message: 'Não é possível agendar em datas/horários passados' },
        { status: 400 }
      )
    }
    
    // Obter horários de funcionamento do estabelecimento
    const workingHours = await prisma.workingHours.findMany({
      where: { tenantId: business.id }
    })
    
    if (!workingHours || workingHours.length === 0) {
      return NextResponse.json(
        { message: 'Horários de funcionamento não configurados' },
        { status: 400 }
      )
    }
    
    // 🇧🇷 CORREÇÃO: Obter dia da semana no timezone brasileiro
    const dayOfWeek = getBrazilDayOfWeek(appointmentUTC)
    const dayName = getBrazilDayNameEn(appointmentUTC)
    
    console.log('🇧🇷 Validação de dia:', {
      appointmentUTC: appointmentUTC.toISOString(),
      appointmentBrazil: appointmentBrazil.toString(),
      dayOfWeek,
      dayName
    })
    
    // Obter configuração do dia da semana
    const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName.toLowerCase())
    
    if (!dayConfig || !dayConfig.isActive) {
      return NextResponse.json(
        { message: `Estabelecimento fechado ${dayName === 'Sunday' ? 'no domingo' : 
                            dayName === 'Monday' ? 'na segunda-feira' :
                            dayName === 'Tuesday' ? 'na terça-feira' :
                            dayName === 'Wednesday' ? 'na quarta-feira' :
                            dayName === 'Thursday' ? 'na quinta-feira' :
                            dayName === 'Friday' ? 'na sexta-feira' :
                            dayName === 'Saturday' ? 'no sábado' : 'neste dia'}` },
        { status: 400 }
      )
    }
    
    // 🇧🇷 CORREÇÃO: Verificar se horário está dentro do funcionamento (timezone brasileiro)
    const appointmentTime = appointmentBrazil.toTimeString().substring(0, 5) // HH:MM
    const startTime = dayConfig.startTime
    const endTime = dayConfig.endTime
    
    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return NextResponse.json(
        { message: `Horário fora do funcionamento. Horário disponível: ${startTime} às ${endTime}` },
        { status: 400 }
      )
    }
    
    // 🔒 VALIDAÇÃO DE CONFLITOS (mesmo sistema do dashboard)
    const serviceDuration = service.duration || 30
    const appointmentEndTime = new Date(appointmentUTC.getTime() + (serviceDuration * 60000))
    
    // Buscar agendamentos conflitantes
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId: business.id,
        dateTime: {
          gte: new Date(appointmentUTC.getTime() - (2 * 60 * 60 * 1000)), // 2h antes
          lte: new Date(appointmentUTC.getTime() + (2 * 60 * 60 * 1000))  // 2h depois
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        service: true
      }
    })
    
    for (const existingApt of conflictingAppointments) {
      const existingStart = new Date(existingApt.dateTime)
      const existingDuration = existingApt.service?.duration || 30
      const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
      
      // Verificar sobreposição
      const hasOverlap = (appointmentUTC < existingEnd) && (appointmentEndTime > existingStart)
      
      if (hasOverlap) {
        // Se há profissional especificado, verificar se é o mesmo
        if (professionalId && existingApt.professionalId === professionalId) {
          return NextResponse.json(
            { message: 'Horário já ocupado por outro agendamento' },
            { status: 400 }
          )
        }
        
        // Se não há profissional, qualquer conflito impede
        if (!professionalId) {
          return NextResponse.json(
            { message: 'Horário já ocupado por outro agendamento' },
            { status: 400 }
          )
        }
      }
    }

    // Criar o agendamento
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: business.id,
        endUserId: client.id,
        serviceId: service.id,
        professionalId: professionalId || null,
        dateTime: appointmentUTC, // Salva em UTC no banco
        duration: serviceDuration,
        totalPrice: service.price,
        status: 'CONFIRMED',
        notes: notes || null,
        paymentStatus: 'PENDING'
      },
      include: {
        endUser: true,
        service: true,
        professional: true
      }
    })

    console.log('✅ Agendamento público criado:', {
      id: appointment.id,
      clientName: client.name,
      serviceName: service.name,
      dateTimeUTC: appointment.dateTime.toISOString(),
      dateTimeBrazil: utcToBrazil(appointment.dateTime).toString()
    })

    return NextResponse.json({
      message: 'Agendamento criado com sucesso!',
      appointment: {
        id: appointment.id,
        dateTime: appointment.dateTime,
        client: appointment.endUser,
        service: appointment.service,
        professional: appointment.professional,
        status: appointment.status
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro ao criar agendamento público:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
