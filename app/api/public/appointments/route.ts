import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getBrazilDayOfWeek, getBrazilDayNameEn, debugTimezone, toLocalISOString, parseDatabaseDateTime, getBrazilNow } from '@/lib/timezone'

// POST - Criar agendamento público
export async function POST(request: NextRequest) {
  try {
    const {
      businessSlug,
      clientName,
      clientPhone,
      clientEmail,
      clientBirthDate,
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
          birthday: clientBirthDate ? new Date(clientBirthDate) : null,
          notes: notes || null
        }
      })
    } else {
      // Atualizar dados do cliente existente se necessário
      if (client.name !== clientName || client.email !== clientEmail || (clientBirthDate && !client.birthday)) {
        client = await prisma.endUser.update({
          where: { id: client.id },
          data: {
            name: clientName,
            email: clientEmail || client.email,
            birthday: clientBirthDate ? new Date(clientBirthDate) : client.birthday,
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

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO - USANDO APENAS TIMEZONE BRASILEIRO
    const appointmentDate = parseDatabaseDateTime(appointmentDateTime) // 🇧🇷 CORREÇÃO: Usar função brasileira
    
    // 🇧🇷 EXPLÍCITO: Sistema brasileiro direto - SEM UTC
    debugTimezone(appointmentDate, 'Agendamento público recebido (BRASILEIRO)')
    
    // Verificar se a data não é no passado (USANDO APENAS TIMEZONE BRASILEIRO)
    const now = getBrazilNow() // 🇧🇷 CORREÇÃO: Usar função brasileira
    if (appointmentDate < now) {
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
    
    // 🇧🇷 NOVO: Obter dia da semana diretamente
    const dayOfWeek = getBrazilDayOfWeek(appointmentDate)
    const dayName = getBrazilDayNameEn(appointmentDate)
    
    console.log('🇧🇷 Validação de dia:', {
      appointmentDate: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
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
    
    // 🔒 VALIDAÇÃO DE CONFLITOS (mesmo sistema do dashboard)
    const serviceDuration = totalDuration // Usar duração total calculada
    const appointmentEndTime = new Date(appointmentDate.getTime() + (serviceDuration * 60000))
    
    // 🎯 ALOCAR PROFISSIONAL AUTOMATICAMENTE para "qualquer profissional"
    let finalProfessionalId = professionalId
    
    if (!professionalId) {
      // "Qualquer profissional": encontrar e alocar um profissional disponível
      const allProfessionals = await prisma.professional.findMany({
        where: { tenantId: business.id, isActive: true },
        select: { id: true, name: true }
        // 🎯 REMOVED: orderBy para evitar seleção sempre do mesmo profissional
      })
      
      if (allProfessionals.length === 0) {
        return NextResponse.json(
          { message: 'Nenhum profissional ativo encontrado' },
          { status: 400 }
        )
      }
      
      // 🔧 VALIDAÇÃO CRÍTICA REFATORADA: Verificação completa e precisa
      const availableProfessionals = []
      
      for (const prof of allProfessionals) {
        try {
          // 🎯 STEP 1: Verificar se profissional trabalha no dia
          const dayOfWeek = appointmentDate.getDay() // 0=domingo, 1=segunda, etc.
          const professionalSchedule = await prisma.professionalSchedule.findFirst({
            where: {
              professionalId: prof.id,
              dayOfWeek: dayOfWeek
            }
          })

          if (!professionalSchedule) {
            console.log(`⚠️ Profissional ${prof.name} NÃO trabalha no dia ${dayOfWeek} (não tem schedule)`)
            continue // Pula profissional que não trabalha neste dia
          }

          // 🎯 STEP 2: Verificar se está dentro do horário de trabalho
          const appointmentTimeString = appointmentDate.toTimeString().substring(0, 5) // "14:00"
          const appointmentMinutes = parseInt(appointmentTimeString.split(':')[0]) * 60 + parseInt(appointmentTimeString.split(':')[1])
          const startMinutes = parseInt(professionalSchedule.startTime.split(':')[0]) * 60 + parseInt(professionalSchedule.startTime.split(':')[1])
          const endMinutes = parseInt(professionalSchedule.endTime.split(':')[0]) * 60 + parseInt(professionalSchedule.endTime.split(':')[1])
          
          if (appointmentMinutes < startMinutes || appointmentMinutes >= endMinutes) {
            console.log(`⚠️ Profissional ${prof.name} fora do horário de trabalho: ${appointmentTimeString} não está entre ${professionalSchedule.startTime}-${professionalSchedule.endTime}`)
            continue // Pula profissional fora do horário
          }

          // 🎯 STEP 3: BUSCAR CONFLITOS EM TEMPO REAL - QUERY ESPECÍFICA POR PROFISSIONAL
          const conflictingAppointments = await prisma.appointment.findMany({
            where: {
              professionalId: prof.id,
              tenantId: business.id,
              dateTime: {
                gte: new Date(appointmentDate.getTime() - (4 * 60 * 60 * 1000)), // 4h antes
                lte: new Date(appointmentDate.getTime() + (4 * 60 * 60 * 1000))  // 4h depois
              },
              status: {
                in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] // Apenas status ativos
              }
            },
            select: {
              id: true,
              dateTime: true,
              duration: true,
              status: true,
              endUser: {
                select: {
                  name: true
                }
              }
            }
          })

          console.log(`🔍 [DEBUG] Profissional ${prof.name} - Agendamentos encontrados:`, {
            total: conflictingAppointments.length,
            appointments: conflictingAppointments.map(apt => ({
              id: apt.id,
              cliente: apt.endUser?.name || 'N/A',
              horario: apt.dateTime.toLocaleTimeString('pt-BR'),
              duracao: apt.duration,
              status: apt.status
            }))
          })

          // Verificar conflito detalhado
          const hasConflict = conflictingAppointments.some(existingApt => {
            const existingStart = existingApt.dateTime
            const existingDuration = existingApt.duration || 30
            const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
            
            const overlap = (appointmentDate < existingEnd) && (appointmentEndTime > existingStart)
            
            if (overlap) {
              console.log(`❌ [CONFLITO] ${prof.name}: Novo agendamento ${appointmentDate.toLocaleTimeString('pt-BR')}-${appointmentEndTime.toLocaleTimeString('pt-BR')} conflita com agendamento ${existingApt.id} (${existingStart.toLocaleTimeString('pt-BR')}-${existingEnd.toLocaleTimeString('pt-BR')})`)
            }
            
            return overlap
          })

          if (hasConflict) {
            console.log(`⚠️ Profissional ${prof.name} tem conflito com agendamento existente no horário ${appointmentTimeString}`)
            continue // Pula profissional com conflitos
          }

          // 🎯 STEP 4: Verificar exceções/folgas
          const exceptions = await prisma.scheduleException.findMany({
            where: {
              professionalId: prof.id,
              OR: [
                {
                  startDatetime: {
                    lte: appointmentDate
                  },
                  endDatetime: {
                    gt: appointmentDate
                  }
                },
                {
                  startDatetime: {
                    lt: appointmentEndTime
                  },
                  endDatetime: {
                    gte: appointmentEndTime
                  }
                },
                {
                  startDatetime: {
                    gte: appointmentDate
                  },
                  endDatetime: {
                    lte: appointmentEndTime
                  }
                }
              ]
            }
          })

          const hasScheduleException = exceptions.some(exception => {
            return (appointmentDate < exception.endDatetime) && (appointmentEndTime > exception.startDatetime)
          })

          if (hasScheduleException) {
            console.log(`⚠️ Profissional ${prof.name} tem folga/exceção na data ${appointmentDate.toISOString()}`)
            continue // Pula profissional com exceções
          }

          // 🎯 STEP 5: Verificar intervalos recorrentes
          const recurringBreaks = await prisma.recurringBreak.findMany({
            where: { scheduleId: professionalSchedule.id }
          })

          let hasBreakConflict = false
          for (const breakItem of recurringBreaks) {
            const breakStartMinutes = parseInt(breakItem.startTime.split(':')[0]) * 60 + parseInt(breakItem.startTime.split(':')[1])
            const breakEndMinutes = parseInt(breakItem.endTime.split(':')[0]) * 60 + parseInt(breakItem.endTime.split(':')[1])
            const serviceEndMinutes = appointmentMinutes + totalDuration
            
            // Verificar se o serviço conflita com o intervalo
            if (appointmentMinutes < breakEndMinutes && serviceEndMinutes > breakStartMinutes) {
              hasBreakConflict = true
              console.log(`⚠️ Profissional ${prof.name} tem conflito com intervalo: ${breakItem.startTime}-${breakItem.endTime}`)
              break
            }
          }

          if (hasBreakConflict) {
            continue // Pula profissional com conflitos de intervalo
          }

          // ✅ PROFISSIONAL DISPONÍVEL!
          availableProfessionals.push(prof)
          console.log(`✅ Profissional ${prof.name} DISPONÍVEL para ${appointmentDate.toISOString()}`)
          
        } catch (error) {
          console.error(`❌ Erro ao verificar profissional ${prof.name}:`, error)
          // Não adicionar profissional se houve erro na verificação
        }
      }
      
      if (availableProfessionals.length === 0) {
        return NextResponse.json(
          { message: 'Horário já ocupado - todos os profissionais estão indisponíveis' },
          { status: 400 }
        )
      }
      
      // 🎯 NOVO: Seleção aleatória entre os profissionais disponíveis
      const randomIndex = Math.floor(Math.random() * availableProfessionals.length)
      const selectedProfessional = availableProfessionals[randomIndex]
      
      finalProfessionalId = selectedProfessional.id
      console.log(`✅ "Qualquer profissional" - ${availableProfessionals.length} disponíveis, selecionado aleatoriamente: ${selectedProfessional.name} (${selectedProfessional.id})`)
    } else {
      // 🎯 PROFISSIONAL ESPECÍFICO: Verificar conflitos em tempo real
      console.log(`🔍 Verificando conflitos para profissional específico: ${professionalId}`)
      
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          professionalId: professionalId,
          tenantId: business.id,
          dateTime: {
            gte: new Date(appointmentDate.getTime() - (4 * 60 * 60 * 1000)), // 4h antes
            lte: new Date(appointmentDate.getTime() + (4 * 60 * 60 * 1000))  // 4h depois
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] // Apenas status ativos
          }
        },
        select: {
          id: true,
          dateTime: true,
          duration: true,
          status: true,
          endUser: {
            select: {
              name: true
            }
          }
        }
      })

      console.log(`🔍 [DEBUG] Profissional específico - Agendamentos encontrados:`, {
        professionalId,
        total: conflictingAppointments.length,
        appointments: conflictingAppointments.map(apt => ({
          id: apt.id,
          cliente: apt.endUser?.name || 'N/A',
          horario: apt.dateTime.toLocaleTimeString('pt-BR'),
          duracao: apt.duration,
          status: apt.status
        }))
      })

      for (const existingApt of conflictingAppointments) {
        const existingStart = existingApt.dateTime
        const existingDuration = existingApt.duration || 30
        const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
        
        // Verificar sobreposição
        const hasOverlap = (appointmentDate < existingEnd) && (appointmentEndTime > existingStart)
        
        if (hasOverlap) {
          console.log(`❌ [CONFLITO ESPECÍFICO] Novo agendamento ${appointmentDate.toLocaleTimeString('pt-BR')}-${appointmentEndTime.toLocaleTimeString('pt-BR')} conflita com agendamento ${existingApt.id} (${existingStart.toLocaleTimeString('pt-BR')}-${existingEnd.toLocaleTimeString('pt-BR')})`)
          
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
      dateTime: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
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
      dateTimeISO: toLocalISOString(appointment.dateTime), // 🇧🇷 CORREÇÃO: Usar função brasileira
      dateTimeBrazil: appointment.dateTime.toString()
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
