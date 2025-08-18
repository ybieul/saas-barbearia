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

    // Validar parâmetros obrigatórios
    if (!professionalIdParam || !dateParam) {
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
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    const dayOfWeek = queryDate.getDay() // 0=Domingo, 1=Segunda, etc.
    const startOfDate = startOfDay(queryDate)
    const endOfDate = endOfDay(queryDate)

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Buscando disponibilidade:', {
        professional: professional.name,
        date: dateParam,
        dayOfWeek,
        serviceDurationMinutes,
        tenantId: user.tenantId
      })
    }

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

    // 5. GERAR SLOTS DE TEMPO DISPONÍVEIS
    const availableTimes: string[] = []
    const intervalMinutes = 5 // Slots de 5 minutos
    
    // Converter horários do profissional para minutos
    const [startHour, startMinute] = professionalSchedule.startTime.split(':').map(Number)
    const [endHour, endMinute] = professionalSchedule.endTime.split(':').map(Number)
    
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

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
          
          // Verificar se há sobreposição entre o período do novo serviço e o agendamento existente
          if (slotStartDateTime < appointmentEnd && slotEndDateTime > appointmentStart) {
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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Disponibilidade calculada:', {
        professional: professional.name,
        date: dateParam,
        total_slots: availableTimes.length,
        working_hours: `${professionalSchedule.startTime} - ${professionalSchedule.endTime}`,
        breaks_count: recurringBreaks.length,
        exceptions_count: exceptions.length,
        appointments_count: existingAppointments.length
      })
    }

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
