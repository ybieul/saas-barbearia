import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { parseISO, format, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'

// GET - Buscar horários disponíveis para um profissional em uma data específica
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    const professionalIdParam = searchParams.get('professional_id')
    const dateParam = searchParams.get('date')
    const serviceDurationParam = searchParams.get('service_duration') // NOVO: duração do serviço

    console.log('🚀 API - Recebendo requisição de disponibilidade:', {
      professionalId: professionalIdParam,
      date: dateParam,
      serviceDuration: serviceDurationParam,
      url: request.url
    })

    // Validar parâmetros obrigatórios
    if (!professionalIdParam || !dateParam) {
      console.log('❌ API - Parâmetros obrigatórios faltando')
      return NextResponse.json(
        { error: 'Parâmetros professional_id e date são obrigatórios (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Duração padrão de 30 minutos se não informada
    const serviceDurationMinutes = serviceDurationParam ? parseInt(serviceDurationParam) : 30

    let queryDate: Date
    try {
      queryDate = parseISO(dateParam)
    } catch (error) {
      console.log('❌ API - Formato de data inválido:', dateParam)
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Verificar se o profissional pertence ao tenant do usuário
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalIdParam,
        tenantId: user.tenantId
      }
    })

    if (!professional) {
      console.log('❌ API - Profissional não encontrado:', professionalIdParam)
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    const dayOfWeek = queryDate.getDay() // 0=Domingo, 1=Segunda, etc.
    const startOfDate = startOfDay(queryDate)
    const endOfDate = endOfDay(queryDate)

    console.log('🔍 API - Buscando disponibilidade:', {
      professional: professional.name,
      date: dateParam,
      dayOfWeek,
      serviceDurationMinutes,
      tenantId: user.tenantId
    })

    // 1. VERIFICAR HORÁRIO DE FUNCIONAMENTO DO PROFISSIONAL
    const professionalSchedule = await prisma.professionalSchedule.findFirst({
      where: {
        professionalId: professionalIdParam,
        dayOfWeek
      },
      include: {
        recurringBreaks: true
      }
    })

    // Se não tem horário definido para este dia, não está disponível
    if (!professionalSchedule) {
      console.log('🚫 API - Profissional não trabalha neste dia:', dayOfWeek)
      return NextResponse.json({
        professional_id: professionalIdParam,
        professional_name: professional.name,
        date: dateParam,
        available_times: [],
        working_hours: {
          start_time: null,
          end_time: null,
          is_open: false
        },
        breaks: [],
        exceptions: []
      })
    }

    console.log('✅ API - Horário de funcionamento encontrado:', {
      startTime: professionalSchedule.startTime,
      endTime: professionalSchedule.endTime,
      breaksCount: professionalSchedule.recurringBreaks.length
    })

    // 2. OBTER INTERVALOS RECORRENTES DO SCHEDULE (já incluído)
    const recurringBreaks = professionalSchedule.recurringBreaks

    // 3. BUSCAR EXCEÇÕES/BLOQUEIOS PARA O DIA
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        professionalId: professionalIdParam,
        OR: [
          {
            // Exceções que começam no dia
            startDatetime: {
              gte: startOfDate,
              lte: endOfDate
            }
          },
          {
            // Exceções que terminam no dia
            endDatetime: {
              gte: startOfDate,
              lte: endOfDate
            }
          },
          {
            // Exceções que cobrem o dia inteiro
            AND: [
              { startDatetime: { lte: startOfDate } },
              { endDatetime: { gte: endOfDate } }
            ]
          }
        ]
      }
    })

    // 4. BUSCAR AGENDAMENTOS EXISTENTES PARA O DIA
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: professionalIdParam,
        dateTime: {
          gte: startOfDate,
          lte: endOfDate
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        services: true
      }
    })

    console.log('🔍 API - Query de agendamentos:', {
      professionalId: professionalIdParam,
      dateRange: {
        gte: startOfDate.toISOString(),
        lte: endOfDate.toISOString()
      },
      queryDate: queryDate.toISOString(),
      startOfDate_local: `${startOfDate.getFullYear()}-${(startOfDate.getMonth()+1).toString().padStart(2,'0')}-${startOfDate.getDate().toString().padStart(2,'0')} ${startOfDate.getHours()}:${startOfDate.getMinutes()}:${startOfDate.getSeconds()}`,
      endOfDate_local: `${endOfDate.getFullYear()}-${(endOfDate.getMonth()+1).toString().padStart(2,'0')}-${endOfDate.getDate().toString().padStart(2,'0')} ${endOfDate.getHours()}:${endOfDate.getMinutes()}:${endOfDate.getSeconds()}`
    })
    
    // 🔍 LOG: Mostrar agendamentos encontrados
    console.log('📅 API - Agendamentos existentes encontrados:', {
      count: existingAppointments.length,
      appointments: existingAppointments.map(apt => ({
        id: apt.id,
        dateTime: apt.dateTime.toISOString(),
        duration: apt.duration,
        status: apt.status,
        localTime: `${apt.dateTime.getHours()}:${apt.dateTime.getMinutes().toString().padStart(2, '0')}`
      }))
    })
    
    // 🔍 LOG: Mostrar exceções encontradas  
    console.log('🚫 API - Exceções/Bloqueios encontrados:', {
      count: exceptions.length,
      exceptions: exceptions.map(ex => ({
        id: ex.id,
        start: ex.startDatetime.toISOString(),
        end: ex.endDatetime.toISOString(),
        reason: ex.reason,
        type: ex.type
      }))
    })

    // 5. GERAR SLOTS DE TEMPO DISPONÍVEIS
    const availableTimes: string[] = []
    const intervalMinutes = 5 // Slots de 5 minutos
    
    // Converter horários do profissional para minutos
    const [startHour, startMinute] = professionalSchedule.startTime.split(':').map(Number)
    const [endHour, endMinute] = professionalSchedule.endTime.split(':').map(Number)
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    console.log('🔄 API - Iniciando geração de slots:', {
      startTotalMinutes,
      endTotalMinutes,
      intervalMinutes,
      serviceDurationMinutes
    })

    // Gerar todos os slots possíveis
    for (let currentMinutes = startTotalMinutes; currentMinutes < endTotalMinutes; currentMinutes += intervalMinutes) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60
      const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      
      // 🔧 CORREÇÃO: Verificar se TODOS os slots necessários para a duração do serviço estão livres
      let isSlotAvailable = true
      const slotsNeeded = Math.ceil(serviceDurationMinutes / intervalMinutes) // Quantidade de slots de 5min necessários
      
      // Verificar se há slots suficientes até o fim do expediente
      if (currentMinutes + serviceDurationMinutes > endTotalMinutes) {
        continue // Pular este slot se o serviço não caber no expediente
      }

      // A. Verificar conflito com intervalos recorrentes para TODOS os slots necessários
      for (let checkMinutes = currentMinutes; checkMinutes < currentMinutes + serviceDurationMinutes; checkMinutes += intervalMinutes) {
        for (const recurringBreak of recurringBreaks) {
          const [breakStartHour, breakStartMinute] = recurringBreak.startTime.split(':').map(Number)
          const [breakEndHour, breakEndMinute] = recurringBreak.endTime.split(':').map(Number)
          
          const breakStartMinutes = breakStartHour * 60 + breakStartMinute
          const breakEndMinutes = breakEndHour * 60 + breakEndMinute
          
          if (checkMinutes >= breakStartMinutes && checkMinutes < breakEndMinutes) {
            console.log(`🚫 API - Slot ${timeSlot} conflita com intervalo:`, {
              breakStart: recurringBreak.startTime,
              breakEnd: recurringBreak.endTime,
              checkMinutes
            })
            isSlotAvailable = false
            break
          }
        }
        if (!isSlotAvailable) break
      }

      // B. Verificar conflito com exceções/bloqueios para TODOS os slots necessários
      if (isSlotAvailable) {
        const slotStartDateTime = new Date(queryDate)
        slotStartDateTime.setHours(hours, minutes, 0, 0)
        const slotEndDateTime = addMinutes(slotStartDateTime, serviceDurationMinutes)
        
        for (const exception of exceptions) {
          const exceptionStart = new Date(exception.startDatetime)
          const exceptionEnd = new Date(exception.endDatetime)
          
          // Verificar se há sobreposição entre o período do serviço e a exceção
          if (slotStartDateTime < exceptionEnd && slotEndDateTime > exceptionStart) {
            console.log(`🚫 API - Slot ${timeSlot} conflita com exceção:`, {
              exceptionStart: exceptionStart.toISOString(),
              exceptionEnd: exceptionEnd.toISOString(),
              slotStart: slotStartDateTime.toISOString(),
              slotEnd: slotEndDateTime.toISOString()
            })
            isSlotAvailable = false
            break
          }
        }
      }

      // C. Verificar conflito com agendamentos existentes para TODOS os slots necessários
      if (isSlotAvailable) {
        const slotStartDateTime = new Date(queryDate)
        slotStartDateTime.setHours(hours, minutes, 0, 0)
        const slotEndDateTime = addMinutes(slotStartDateTime, serviceDurationMinutes)
        
        for (const appointment of existingAppointments) {
          const appointmentStart = new Date(appointment.dateTime)
          const appointmentDurationMinutes = appointment.duration || 30
          const appointmentEnd = addMinutes(appointmentStart, appointmentDurationMinutes)
          
          // 🔧 CORREÇÃO: Verificação mais robusta de sobreposição
          const hasOverlap = slotStartDateTime < appointmentEnd && slotEndDateTime > appointmentStart
          
          if (hasOverlap) {
            console.log(`⚠️ API - Conflito detectado no slot ${timeSlot}:`, {
              slotStart: slotStartDateTime.toISOString(),
              slotEnd: slotEndDateTime.toISOString(),
              appointmentStart: appointmentStart.toISOString(),
              appointmentEnd: appointmentEnd.toISOString(),
              appointmentId: appointment.id,
              hasOverlap
            })
            isSlotAvailable = false
            break
          }
        }
      }

      // Se o slot passou em todas as verificações, adicionar à lista
      if (isSlotAvailable) {
        availableTimes.push(timeSlot)
      }
    }

    console.log('✅ API - Disponibilidade calculada:', {
      professional: professional.name,
      date: dateParam,
      total_slots: availableTimes.length,
      working_hours: `${professionalSchedule.startTime} - ${professionalSchedule.endTime}`,
      breaks_count: recurringBreaks.length,
      exceptions_count: exceptions.length,
      appointments_count: existingAppointments.length,
      available_times_sample: availableTimes.slice(0, 10), // Primeiros 10 horários
      service_duration_minutes: serviceDurationMinutes
    })

    return NextResponse.json({
      professional_id: professionalIdParam,
      professional_name: professional.name,
      date: dateParam,
      available_times: availableTimes,
      working_hours: {
        start_time: professionalSchedule.startTime,
        end_time: professionalSchedule.endTime,
        is_open: true
      },
      breaks: recurringBreaks.map(rb => ({
        start_time: rb.startTime,
        end_time: rb.endTime,
        reason: 'Intervalo' // Valor padrão, já que não há campo reason no schema
      })),
      exceptions: exceptions.map(ex => ({
        id: ex.id,
        start_datetime: ex.startDatetime.toISOString(),
        end_datetime: ex.endDatetime.toISOString(),
        reason: ex.reason || 'Bloqueio',
        type: ex.type
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
