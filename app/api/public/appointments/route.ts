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
      serviceId,      // Serviço principal (compatibilidade)
      services,       // Array com todos os serviços (principal + upsells)
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

    // Buscar tenant por customLink
    const business = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: {
          path: '$.customLink',
          equals: businessSlug
        }
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

    // ✅ NOVO: Calcular duração e preço total de TODOS os serviços
    let totalDuration = 0
    let totalPrice = 0
    let mainService = null

    if (services && Array.isArray(services) && services.length > 0) {
      // Se veio array de serviços (principal + upsells), calcular tudo
      const allServices = await prisma.service.findMany({
        where: { 
          id: { in: services },
          tenantId: business.id 
        }
      })

      if (allServices.length !== services.length) {
        return NextResponse.json(
          { message: 'Um ou mais serviços não foram encontrados' },
          { status: 404 }
        )
      }

      // Calcular totais
      totalDuration = allServices.reduce((sum, s) => sum + (s.duration || 0), 0)
      totalPrice = allServices.reduce((sum, s) => sum + Number(s.price || 0), 0)
      
      // Serviço principal é o primeiro do array
      mainService = allServices.find(s => s.id === serviceId) || allServices[0]
      
      console.log('🎯 Agendamento com upsells:', {
        totalServices: allServices.length,
        serviceNames: allServices.map(s => s.name),
        totalDuration: `${totalDuration} min`,
        totalPrice: `R$ ${totalPrice}`
      })
    } else {
      // Fallback: apenas serviço principal
      mainService = await prisma.service.findFirst({
        where: { id: serviceId, tenantId: business.id }
      })

      if (!mainService) {
        return NextResponse.json(
          { message: 'Serviço não encontrado' },
          { status: 404 }
        )
      }

      totalDuration = mainService.duration || 30
      totalPrice = Number(mainService.price || 0)
    }

    // Buscar profissional (se especificado)
    const professional = professionalId ? await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: business.id }
    }) : null

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
    const serviceDuration = totalDuration // Usar duração total calculada
    const appointmentEndTime = new Date(appointmentUTC.getTime() + (serviceDuration * 60000))
    
    // Buscar agendamentos conflitantes (sem include para evitar problemas de schema)
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
      }
    })
    
    // 🎯 ALOCAR PROFISSIONAL AUTOMATICAMENTE para "qualquer profissional"
    let finalProfessionalId = professionalId
    
    if (!professionalId) {
      // "Qualquer profissional": encontrar e alocar um profissional disponível
      const allProfessionals = await prisma.professional.findMany({
        where: { tenantId: business.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' } // Ordenar por nome para consistência
      })
      
      if (allProfessionals.length === 0) {
        return NextResponse.json(
          { message: 'Nenhum profissional ativo encontrado' },
          { status: 400 }
        )
      }
      
      // Encontrar o primeiro profissional disponível
      let availableProfessional = null
      
      for (const prof of allProfessionals) {
        const hasConflict = conflictingAppointments.some(existingApt => {
          if (existingApt.professionalId !== prof.id) return false
          
          const existingStart = new Date(existingApt.dateTime)
          const existingDuration = existingApt.duration || 30  // ✅ Usar duração do próprio agendamento
          const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
          
          return (appointmentUTC < existingEnd) && (appointmentEndTime > existingStart)
        })
        
        if (!hasConflict) {
          availableProfessional = prof
          break // Primeiro disponível encontrado
        }
      }
      
      if (!availableProfessional) {
        return NextResponse.json(
          { message: 'Horário já ocupado - todos os profissionais estão indisponíveis' },
          { status: 400 }
        )
      }
      
      // Alocar o profissional encontrado
      finalProfessionalId = availableProfessional.id
      console.log(`✅ "Qualquer profissional" alocado para: ${availableProfessional.name} (${availableProfessional.id})`)
    } else {
      // Profissional específico: verificar conflitos apenas com este profissional
      for (const existingApt of conflictingAppointments) {
        if (existingApt.professionalId !== professionalId) continue
        
        const existingStart = new Date(existingApt.dateTime)
        const existingDuration = existingApt.duration || 30  // ✅ Usar duração do próprio agendamento
        const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
        
        // Verificar sobreposição
        const hasOverlap = (appointmentUTC < existingEnd) && (appointmentEndTime > existingStart)
        
        if (hasOverlap) {
          return NextResponse.json(
            { message: 'Horário já ocupado por outro agendamento' },
            { status: 400 }
          )
        }
      }
    }

    // ✅ CRIAR AGENDAMENTO COM RELACIONAMENTO MANY-TO-MANY
    // Nota: Usar 'any' é necessário devido ao cache de tipos do Prisma local
    // Em produção, após deploy + migrate, os tipos estarão corretos
    const appointmentData: any = {
      tenantId: business.id,
      endUserId: client.id,
      professionalId: finalProfessionalId,
      dateTime: appointmentUTC,
      duration: totalDuration,
      totalPrice: totalPrice,
      status: 'CONFIRMED',
      notes: notes || null,
      paymentStatus: 'PENDING',
      // ✅ CONECTAR SERVIÇOS: Many-to-Many relationship
      services: {
        connect: services && Array.isArray(services) && services.length > 0
          ? services.map((serviceId: string) => ({ id: serviceId }))
          : [{ id: serviceId }]
      }
    }

    // ✅ CRIAR AGENDAMENTO (sem include para evitar conflitos de tipos)
    const appointment = await prisma.appointment.create({
      data: appointmentData
    })

    // ✅ BUSCAR DADOS RELACIONADOS APÓS CRIAÇÃO
    const [appointmentClient, appointmentProfessional, appointmentServices] = await Promise.all([
      prisma.endUser.findUnique({ where: { id: appointment.endUserId } }),
      appointment.professionalId 
        ? prisma.professional.findUnique({ where: { id: appointment.professionalId } })
        : null,
      prisma.service.findMany({
        where: { appointments: { some: { id: appointment.id } } }
      })
    ])

    console.log('✅ Agendamento público criado com many-to-many:', {
      id: appointment.id,
      clientName: appointmentClient?.name || 'Nome não encontrado',
      serviceNames: appointmentServices.map(s => s.name).join(', '),
      serviceCount: appointmentServices.length,
      totalDuration: `${totalDuration} min`,
      totalPrice: `R$ ${totalPrice}`,
      dateTimeUTC: appointment.dateTime.toISOString(),
      dateTimeBrazil: utcToBrazil(appointment.dateTime).toString()
    })

    return NextResponse.json({
      message: 'Agendamento criado com sucesso!',
      appointment: {
        id: appointment.id,
        dateTime: appointment.dateTime,
        client: appointmentClient,
        services: appointmentServices,
        mainService: appointmentServices[0],
        professional: appointmentProfessional,
        status: appointment.status,
        totalServices: appointmentServices.length,
        totalDuration,
        totalPrice
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
