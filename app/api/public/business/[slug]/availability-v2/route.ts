import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { format, parseISO, getDay, startOfDay, endOfDay, addMinutes, isSameDay } from 'date-fns'
import { generateTimeSlots, timePeriodsOverlap, toSystemTimezone, canSlotAccommodateService, timeToMinutes } from '@/lib/schedule-utils'
import type { AvailabilitySlot, DayAvailability } from '@/lib/types/schedule'

// GET - Buscar disponibilidade completa de um profissional
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    const professionalId = searchParams.get('professionalId')
    const serviceDuration = parseInt(searchParams.get('serviceDuration') || '30') // duração em minutos

    // Validações básicas
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Data é obrigatória (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (!professionalId) {
      return NextResponse.json(
        { error: 'professionalId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar tenant por slug
    const business = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: {
          path: '$.customLink',
          equals: slug
        }
      }
    })

    // 🔍 DEBUG: Log do tenant encontrado
    console.log('🔍 [AVAILABILITY-V2] Tenant encontrado:', {
      slug,
      businessId: business?.id,
      businessName: business?.name,
      businessConfig: business?.businessConfig
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }

    // Validar profissional
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        tenantId: business.id,
        isActive: true
      }
    })

    // 🔍 DEBUG: Log do profissional encontrado
    console.log('🔍 [AVAILABILITY-V2] Profissional encontrado:', {
      professionalId,
      professional: professional ? {
        id: professional.id,
        name: professional.name,
        tenantId: professional.tenantId,
        isActive: professional.isActive
      } : null
    })

    if (!professional) {
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Parsear data
    let targetDate: Date
    try {
      targetDate = parseISO(date)
    } catch {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const dayOfWeek = getDay(targetDate) // 0 = Domingo, 1 = Segunda, etc.

    // PASSO 1: Verificar horário padrão do profissional
    const schedule = await prisma.professionalSchedule.findFirst({
      where: {
        professionalId,
        dayOfWeek
      },
      include: {
        recurringBreaks: true
      }
    })

    // Se não tem horário configurado para este dia, não trabalha
    if (!schedule) {
      return NextResponse.json({
        date,
        dayOfWeek,
        professionalId,
        professionalName: professional.name,
        workingHours: null,
        slots: [],
        message: 'Profissional não trabalha neste dia'
      } as DayAvailability)
    }

    // PASSO 2: Gerar TODOS os slots de 5min baseados no horário de trabalho
    const allSlots = generateTimeSlots(
      schedule.startTime.substring(0, 5), // Remover segundos se houver (HH:MM)
      schedule.endTime.substring(0, 5),
      5 // Sempre slots de 5 em 5 minutos
    )

    // PASSO 2.1: Filtrar horários passados (apenas para o dia atual)
    const now = new Date()
    const nowBRT = toSystemTimezone(now)  // ✅ Converter para timezone brasileiro
    const isToday = isSameDay(targetDate, nowBRT)
    
    let slotsAfterTimeFilter = allSlots
    
    if (isToday) {
      const currentTime = format(nowBRT, 'HH:mm')  // ✅ Usar horário BRT
      const currentMinutes = timeToMinutes(currentTime)
      
      slotsAfterTimeFilter = allSlots.filter(slotTime => {
        const slotMinutes = timeToMinutes(slotTime)
        return slotMinutes > currentMinutes
      })
      
      // 🔍 DEBUG: Log do filtro de horário atual
      console.log('🔍 [AVAILABILITY-V2] Filtro de horário atual aplicado:', {
        isToday,
        nowUTC: now.toISOString(),
        nowBRT: nowBRT.toISOString(),
        currentTime,
        currentMinutes,
        originalSlotsCount: allSlots.length,
        filteredSlotsCount: slotsAfterTimeFilter.length,
        removedSlots: allSlots.filter(slot => timeToMinutes(slot) <= currentMinutes).slice(0, 10), // Primeiros 10 para debug
        remainingSlots: slotsAfterTimeFilter.slice(0, 5) // Primeiros 5 para debug
      })
    }

    // PASSO 2.5: Remover slots que estão dentro dos intervalos recorrentes (como almoço)
    const recurringBreaks = await prisma.recurringBreak.findMany({
      where: {
        scheduleId: schedule.id
      }
    })

    let availableSlotsAfterBreaks = slotsAfterTimeFilter.filter(slotTime => {
      // Converter slot time para minutos para comparação
      const [slotHours, slotMinutes] = slotTime.split(':').map(Number)
      const slotTimeInMinutes = slotHours * 60 + slotMinutes
      
      // Verificar se o slot está dentro de algum intervalo recorrente
      for (const breakItem of recurringBreaks) {
        const [breakStartHours, breakStartMinutes] = breakItem.startTime.split(':').map(Number)
        const [breakEndHours, breakEndMinutes] = breakItem.endTime.split(':').map(Number)
        
        const breakStartInMinutes = breakStartHours * 60 + breakStartMinutes
        const breakEndInMinutes = breakEndHours * 60 + breakEndMinutes
        
        // Se o slot está dentro do intervalo, remover
        if (slotTimeInMinutes >= breakStartInMinutes && slotTimeInMinutes < breakEndInMinutes) {
          return false
        }
      }
      
      return true
    })

    // PASSO 3: Buscar agendamentos existentes para o dia
    const startOfTargetDay = startOfDay(targetDate)
    const endOfTargetDay = endOfDay(targetDate)

    // 🔍 DEBUG: Log da query de agendamentos
    console.log('🔍 [AVAILABILITY-V2] Buscando agendamentos existentes:', {
      professionalId,
      tenantId: business.id,
      businessSlug: slug,
      targetDate: targetDate.toISOString(),
      startOfTargetDay: startOfTargetDay.toISOString(),
      endOfTargetDay: endOfTargetDay.toISOString(),
      statusFilter: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
    })

    // 🔧 DIAGNÓSTICO: Primeiro, buscar TODOS os agendamentos do dia SEM filtros
    const allAppointmentsForDay = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: startOfTargetDay,
          lte: endOfTargetDay
        }
      },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        status: true,
        professionalId: true,
        tenantId: true,
        endUser: {
          select: {
            name: true
          }
        }
      }
    })

    console.log('🔍 [AVAILABILITY-V2] TODOS os agendamentos do dia (sem filtros):', {
      count: allAppointmentsForDay.length,
      appointments: allAppointmentsForDay.map(apt => ({
        id: apt.id,
        dateTime: apt.dateTime.toISOString(),
        timeString: apt.dateTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        duration: apt.duration,
        status: apt.status,
        professionalId: apt.professionalId,
        tenantId: apt.tenantId,
        clientName: apt.endUser?.name,
        matchesProfessional: apt.professionalId === professionalId,
        matchesTenant: apt.tenantId === business.id,
        statusMatches: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(apt.status as string)
      }))
    })

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        tenantId: business.id,
        dateTime: {
          gte: startOfTargetDay,
          lte: endOfTargetDay
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
        }
      },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        status: true
      }
    })

    // 🔍 DEBUG: Log dos agendamentos encontrados com filtros
    console.log('🔍 [AVAILABILITY-V2] Agendamentos COM filtros:', {
      count: existingAppointments.length,
      appointments: existingAppointments.map(apt => ({
        id: apt.id,
        dateTime: apt.dateTime.toISOString(),
        duration: apt.duration,
        status: apt.status,
        timeString: apt.dateTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
    })

    // PASSO 4: Buscar bloqueios/exceções para o dia
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        professionalId,
        OR: [
          {
            // Exceções que começam no dia
            startDatetime: {
              gte: startOfTargetDay,
              lte: endOfTargetDay
            }
          },
          {
            // Exceções que terminam no dia
            endDatetime: {
              gte: startOfTargetDay,
              lte: endOfTargetDay
            }
          },
          {
            // Exceções que cobrem o dia inteiro
            AND: [
              { startDatetime: { lte: startOfTargetDay } },
              { endDatetime: { gte: endOfTargetDay } }
            ]
          }
        ]
      }
    })

    // 🔍 DEBUG: Log detalhado das exceções encontradas
    console.log('🔍 [AVAILABILITY-V2] Exceções encontradas:', {
      count: exceptions.length,
      targetDate: targetDate.toISOString(),
      startOfTargetDay: startOfTargetDay.toISOString(),
      endOfTargetDay: endOfTargetDay.toISOString(),
      exceptions: exceptions.map(exc => ({
        id: exc.id,
        startDatetime: exc.startDatetime.toISOString(),
        endDatetime: exc.endDatetime.toISOString(),
        reason: exc.reason,
        type: exc.type,
        // 🔍 DIAGNÓSTICO DE TIMEZONE
        timezoneAnalysis: {
          startLocal: exc.startDatetime.toLocaleString('pt-BR'),
          endLocal: exc.endDatetime.toLocaleString('pt-BR'),
          startUTC: exc.startDatetime.getUTCHours() + ':' + exc.startDatetime.getUTCMinutes().toString().padStart(2, '0'),
          endUTC: exc.endDatetime.getUTCHours() + ':' + exc.endDatetime.getUTCMinutes().toString().padStart(2, '0'),
          startLocal24: exc.startDatetime.getHours() + ':' + exc.startDatetime.getMinutes().toString().padStart(2, '0'),
          endLocal24: exc.endDatetime.getHours() + ':' + exc.endDatetime.getMinutes().toString().padStart(2, '0')
        }
      }))
    })

    // 🔧 FUNÇÃO DE CORREÇÃO: Ajustar timezone das exceções para compatibilidade
    const adjustExceptionTimezone = (exceptionDate: Date): Date => {
      // Detectar "falso UTC": se (hora local + offset BRT) == hora UTC, então foi salvo incorretamente
      // Exemplo: 14:30 BRT salvo como 14:30Z aparece como:
      // - Local: 11h (14h - 3h offset BRT)  
      // - UTC: 14h
      // - Test: 11 + 3 = 14 ✓ (é falso UTC)
      
      const localHour = exceptionDate.getHours() // Em BRT devido ao timezone do sistema
      const utcHour = exceptionDate.getUTCHours() // Em UTC real
      const brtOffset = 3 // BRT é UTC-3
      
      if ((localHour + brtOffset) === utcHour) {
        // Converter "falso UTC" para UTC real subtraindo o offset BRT
        const correctedDate = new Date(exceptionDate.getTime() - (brtOffset * 60 * 60 * 1000))
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 [TIMEZONE-FIX] Exceção detectada como "falso UTC" - aplicando correção:', {
            original: exceptionDate.toISOString(),
            originalBRT: exceptionDate.toLocaleString('pt-BR'),
            corrected: correctedDate.toISOString(),
            correctedBRT: correctedDate.toLocaleString('pt-BR'),
            explanation: `Converteu "${localHour}:xx BRT salvo como ${utcHour}:xx UTC" para "${correctedDate.getUTCHours()}:xx UTC real"`
          })
        }
        
        return correctedDate
      }
      
      // Se já está em UTC real, retornar sem modificar
      return exceptionDate
    }

    // PASSO 5: Processar cada slot de 5min individualmente
    const allSlotsStatus: AvailabilitySlot[] = availableSlotsAfterBreaks.map(slotTime => {
      const [hours, minutes] = slotTime.split(':').map(Number)
      
      // 🔧 CORREÇÃO CRÍTICA: Criar data do slot em UTC para coincidir com banco de dados
      // Banco salva agendamentos em UTC, então slots devem ser criados em UTC também
      const slotStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), hours, minutes, 0, 0))
      const slotEnd = addMinutes(slotStart, 5) // ✅ CORRETO: Cada slot é de 5 minutos

      let available = true
      let reason: string | undefined

      // 🔍 DEBUG: Log para slot específico (apenas slots críticos)
      const isDebugSlot = ['11:00', '11:05', '11:10', '11:15'].includes(slotTime)
      if (isDebugSlot) {
        console.log(`🔍 [AVAILABILITY-V2] Verificando slot ${slotTime} (CORREÇÃO UTC):`, {
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          slotStartTime: slotStart.getTime(),
          slotEndTime: slotEnd.getTime(),
          appointmentsToCheck: existingAppointments.length,
          targetDateInfo: {
            original: targetDate.toISOString(),
            utcYear: targetDate.getUTCFullYear(),
            utcMonth: targetDate.getUTCMonth(),
            utcDate: targetDate.getUTCDate(),
            timezone: 'Forçado para UTC'
          }
        })
      }

      // Verificar se este slot de 5min está ocupado por algum agendamento
      for (const appointment of existingAppointments) {
        const appointmentEnd = addMinutes(appointment.dateTime, appointment.duration)
        
        // 🔍 DEBUG: Log detalhado da verificação de sobreposição
        if (isDebugSlot) {
          console.log(`🔍 [AVAILABILITY-V2] Verificando sobreposição slot ${slotTime} (UTC CORRIGIDO):`, {
            appointmentId: appointment.id,
            appointmentStart: appointment.dateTime.toISOString(),
            appointmentEnd: appointmentEnd.toISOString(),
            appointmentDuration: appointment.duration,
            slotStart: slotStart.toISOString(),
            slotEnd: slotEnd.toISOString(),
            // Verificação manual de sobreposição
            timezoneCheck: {
              slotTimezone: 'UTC (corrigido)',
              appointmentTimezone: 'UTC (banco)',
              slotStartUTC: slotStart.getTime(),
              slotEndUTC: slotEnd.getTime(),
              appointmentStartUTC: appointment.dateTime.getTime(),
              appointmentEndUTC: appointmentEnd.getTime(),
              timeDifference: Math.abs(slotStart.getTime() - appointment.dateTime.getTime()) / 1000 / 60 // em minutos
            },
            overlaps: {
              condition1: slotStart < appointmentEnd,
              condition2: slotEnd > appointment.dateTime,
              result: slotStart < appointmentEnd && slotEnd > appointment.dateTime
            }
          })
        }
        
        // 🔧 CORREÇÃO: Verificação manual de sobreposição mais precisa
        const hasOverlap = slotStart < appointmentEnd && slotEnd > appointment.dateTime
        
        if (hasOverlap) {
          available = false
          reason = 'Agendado'
          
          if (isDebugSlot) {
            console.log(`🎯 [AVAILABILITY-V2] ✅ CONFLITO DETECTADO CORRETAMENTE no slot ${slotTime}!`)
            console.log(`🎯 [AVAILABILITY-V2] Slot ${slotTime} marcado como INDISPONÍVEL devido ao agendamento ${appointment.id}`)
          }
          break
        } else if (isDebugSlot) {
          console.log(`⚠️ [AVAILABILITY-V2] Sem conflito no slot ${slotTime} com agendamento ${appointment.id}`)
        }
      }

      // Verificar conflito com exceções/bloqueios
      if (available) {
        for (const exception of exceptions) {
          if (timePeriodsOverlap(slotStart, slotEnd, exception.startDatetime, exception.endDatetime)) {
            available = false
            reason = exception.reason || (exception.type === 'DAY_OFF' ? 'Folga' : 'Bloqueado')
            break
          }
        }
      }

      return {
        time: slotTime,
        available,
        reason
      }
    })

    // 🔧 FUNÇÃO AUXILIAR: Verificar se um serviço com duração específica conflita com intervalos/exceções
    const serviceConflictsWithBreaksOrExceptions = (
      startTime: string,
      durationMinutes: number,
      recurringBreaks: any[],
      exceptions: any[]
    ): boolean => {
      const [startHours, startMinutes] = startTime.split(':').map(Number)
      const serviceStartMinutes = startHours * 60 + startMinutes
      const serviceEndMinutes = serviceStartMinutes + durationMinutes

      // 🔍 DEBUG: Log para slots específicos problemáticos
      const isDebugSlot = ['11:50', '11:55', '12:55'].includes(startTime)
      if (isDebugSlot) {
        console.log(`🔍 [AVAILABILITY-V2] Verificando conflito de duração para slot ${startTime}:`, {
          serviceStart: startTime,
          serviceDuration: durationMinutes,
          serviceEnd: `${Math.floor(serviceEndMinutes / 60)}:${String(serviceEndMinutes % 60).padStart(2, '0')}`,
          recurringBreaksCount: recurringBreaks.length,
          exceptionsCount: exceptions.length
        })
      }

      // Verificar conflito com intervalos recorrentes (almoço, etc.)
      for (const breakItem of recurringBreaks) {
        const [breakStartHours, breakStartMins] = breakItem.startTime.split(':').map(Number)
        const [breakEndHours, breakEndMins] = breakItem.endTime.split(':').map(Number)
        
        const breakStartInMinutes = breakStartHours * 60 + breakStartMins
        const breakEndInMinutes = breakEndHours * 60 + breakEndMins

        // Verificar se há sobreposição entre serviço e intervalo
        // Serviço: [serviceStartMinutes, serviceEndMinutes]
        // Intervalo: [breakStartInMinutes, breakEndInMinutes]
        const hasOverlap = serviceStartMinutes < breakEndInMinutes && serviceEndMinutes > breakStartInMinutes
        
        if (isDebugSlot) {
          console.log(`🔍 [AVAILABILITY-V2] Verificando intervalo ${breakItem.startTime}-${breakItem.endTime}:`, {
            breakStart: `${breakItem.startTime} (${breakStartInMinutes}min)`,
            breakEnd: `${breakItem.endTime} (${breakEndInMinutes}min)`,
            serviceRange: `${serviceStartMinutes}-${serviceEndMinutes}min`,
            hasOverlap
          })
        }
        
        if (hasOverlap) {
          console.log(`🚨 [AVAILABILITY-V2] CONFLITO DETECTADO - Serviço ${startTime} (${durationMinutes}min) conflita com intervalo ${breakItem.startTime}-${breakItem.endTime}`)
          return true // Há conflito
        }
      }

      // Verificar conflito com exceções/bloqueios pontuais
      for (const exception of exceptions) {
        // 🔧 CORREÇÃO: Aplicar correção de timezone nas exceções antes da comparação
        const correctedStartException = adjustExceptionTimezone(exception.startDatetime)
        const correctedEndException = adjustExceptionTimezone(exception.endDatetime)
        
        // 🔧 CORREÇÃO: Exceções usam Date objects, não strings - usar versão corrigida
        const exceptionStartMinutes = correctedStartException.getHours() * 60 + correctedStartException.getMinutes()
        const exceptionEndMinutes = correctedEndException.getHours() * 60 + correctedEndException.getMinutes()

        if (isDebugSlot) {
          console.log('🔧 [EXCEPTION-TIMEZONE-CORRECTION]', {
            originalException: {
              start: exception.startDatetime.toISOString(),
              end: exception.endDatetime.toISOString(),
              startLocal: exception.startDatetime.toLocaleString('pt-BR'),
              endLocal: exception.endDatetime.toLocaleString('pt-BR')
            },
            correctedVersion: {
              start: correctedStartException.toISOString(),
              end: correctedEndException.toISOString(),
              startLocal: correctedStartException.toLocaleString('pt-BR'),
              endLocal: correctedEndException.toLocaleString('pt-BR')
            },
            timeInMinutes: {
              original: `${exception.startDatetime.getHours() * 60 + exception.startDatetime.getMinutes()}-${exception.endDatetime.getHours() * 60 + exception.endDatetime.getMinutes()}`,
              corrected: `${exceptionStartMinutes}-${exceptionEndMinutes}`
            }
          })
        }

        // Verificar se há sobreposição entre serviço e exceção
        const hasOverlap = serviceStartMinutes < exceptionEndMinutes && serviceEndMinutes > exceptionStartMinutes
        
        if (isDebugSlot && hasOverlap) {
          console.log(`🔍 [AVAILABILITY-V2] Verificando exceção:`, {
            exceptionReason: exception.reason,
            exceptionStart: exception.startDatetime.toISOString(),
            exceptionEnd: exception.endDatetime.toISOString(),
            serviceRange: `${serviceStartMinutes}-${serviceEndMinutes}min`,
            hasOverlap
          })
        }
        
        if (hasOverlap) {
          console.log(`🚨 [AVAILABILITY-V2] CONFLITO DETECTADO - Serviço ${startTime} (${durationMinutes}min) conflita com exceção: ${exception.reason}`)
          return true // Há conflito
        }
      }

      return false // Sem conflitos
    }

    // PASSO 5.5: Filtrar slots que podem iniciar um serviço da duração solicitada
    const availableSlots: AvailabilitySlot[] = allSlotsStatus.filter(slot => {
      if (!slot.available) {
        return false // Slot já está ocupado
      }

      // 🔧 CORREÇÃO CRÍTICA: Verificar se duração do serviço conflita com intervalos/exceções
      if (serviceConflictsWithBreaksOrExceptions(slot.time, serviceDuration, recurringBreaks, exceptions)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ [AVAILABILITY-V2] Slot ${slot.time} removido - serviço de ${serviceDuration}min conflitaria com intervalo/exceção`)
        }
        return false // Remove slot que causaria conflito
      }

      // ✅ VERIFICAÇÃO ORIGINAL: Verificar se há slots consecutivos suficientes para o serviço
      const slotIndex = allSlotsStatus.findIndex(s => s.time === slot.time)
      const slotsNeeded = Math.ceil(serviceDuration / 5) // Quantos slots de 5min são necessários
      
      // Verificar se há slots disponíveis suficientes a partir deste ponto
      for (let i = 0; i < slotsNeeded; i++) {
        const checkSlot = allSlotsStatus[slotIndex + i]
        if (!checkSlot || !checkSlot.available) {
          return false // Não há slots consecutivos suficientes
        }
      }
      
      return true // Este slot pode iniciar um serviço da duração solicitada
    })

    // PASSO 6: Verificar se há exceção de folga que cobre o dia inteiro
    const dayOffException = exceptions.find((exc) => 
      exc.type === 'DAY_OFF' && 
      exc.startDatetime <= startOfTargetDay && 
      exc.endDatetime >= endOfTargetDay
    )

    if (dayOffException) {
      return NextResponse.json({
        date,
        dayOfWeek,
        professionalId,
        professionalName: professional.name,
        workingHours: {
          startTime: schedule.startTime,
          endTime: schedule.endTime
        },
        slots: [],
        message: `Profissional de folga: ${dayOffException.reason || 'Folga'}`
      } as DayAvailability)
    }

    return NextResponse.json({
      date,
      dayOfWeek,
      professionalId,
      professionalName: professional.name,
      workingHours: {
        startTime: schedule.startTime.substring(0, 5),
        endTime: schedule.endTime.substring(0, 5)
      },
      serviceDuration,
      slots: availableSlots,
      totalSlots: availableSlots.length,
      allSlotsStatus: allSlotsStatus, // Sempre incluir para debug em produção
      recurringBreaks: recurringBreaks.map(b => ({
        startTime: b.startTime,
        endTime: b.endTime
      })),
      message: availableSlots.length > 0 
        ? `${availableSlots.length} horários disponíveis para serviço de ${serviceDuration} minutos`
        : `Nenhum horário disponível para serviço de ${serviceDuration} minutos`,
      // 🔍 DEBUG: Informações extras para diagnóstico
      debug: {
        existingAppointmentsCount: existingAppointments.length,
        totalGeneratedSlots: allSlots.length,
        slotsAfterBreaks: availableSlotsAfterBreaks.length,
        allSlotsProcessed: allSlotsStatus.length,
        targetDateParsed: targetDate.toISOString(),
        businessInfo: {
          tenantId: business.id,
          slug: slug
        },
        // 🚨 LOGS DETALHADOS para aparecer no Network tab
        queryResults: {
          allAppointmentsForDay: allAppointmentsForDay.map(apt => ({
            id: apt.id,
            dateTime: apt.dateTime.toISOString(),
            timeString: apt.dateTime.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            duration: apt.duration,
            status: apt.status,
            professionalId: apt.professionalId,
            tenantId: apt.tenantId,
            clientName: apt.endUser?.name,
            matchesProfessional: apt.professionalId === professionalId,
            matchesTenant: apt.tenantId === business.id,
            statusMatches: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(apt.status as string)
          })),
          filteredAppointments: existingAppointments.map(apt => ({
            id: apt.id,
            dateTime: apt.dateTime.toISOString(),
            duration: apt.duration,
            status: apt.status,
            timeString: apt.dateTime.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          })),
          criticalSlots: allSlotsStatus
            .filter(slot => ['11:00', '11:05', '11:10', '11:15'].includes(slot.time))
            .map(slot => ({
              time: slot.time,
              available: slot.available,
              reason: slot.reason
            }))
        }
      }
    })

  } catch (error) {
    console.error('Erro ao calcular disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
