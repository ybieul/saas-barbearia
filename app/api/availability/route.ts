import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { parseDatabaseDateTime, extractTimeFromDateTime, toLocalISOString } from '@/lib/timezone'

// GET - Buscar horários disponíveis para um profissional em uma data específica
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    const professionalIdParam = searchParams.get('professionalId') || searchParams.get('professional_id')
    const dateParam = searchParams.get('date')
    const serviceDurationParam = searchParams.get('serviceDuration') || searchParams.get('service_duration')

    console.log('🚀 API Dashboard - Recebendo requisição de disponibilidade:', {
      professionalId: professionalIdParam,
      date: dateParam,
      serviceDuration: serviceDurationParam,
      tenantId: user.tenantId
    })

    // Validar parâmetros obrigatórios
    if (!professionalIdParam || !dateParam) {
      console.log('❌ API Dashboard - Parâmetros obrigatórios faltando')
      return NextResponse.json(
        { error: 'Parâmetros professionalId e date são obrigatórios (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const serviceDurationMinutes = serviceDurationParam ? parseInt(serviceDurationParam) : 30

    // 🇧🇷 CORREÇÃO: Usar mesma lógica da API pública (funcional)
    const [year, month, day] = dateParam.split('-').map(Number)
    const queryDate = new Date(year, month - 1, day)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
    const dayOfWeek = queryDate.getDay()

    console.log('🔍 API Dashboard - Info da data:', {
      dateParam,
      queryDate: queryDate.toISOString(),
      dayOfWeek,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    })

    // Verificar se o profissional pertence ao tenant do usuário
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalIdParam,
        tenantId: user.tenantId
      }
    })

    if (!professional) {
      console.log('❌ API Dashboard - Profissional não encontrado:', professionalIdParam)
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
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

    if (!professionalSchedule) {
      console.log('🚫 API Dashboard - Profissional não trabalha neste dia:', dayOfWeek)
      return NextResponse.json({
        professional_id: professionalIdParam,
        professional_name: professional.name,
        date: dateParam,
        available_times: [],
        metadata: {
          working_hours: null,
          is_open: false,
          reason: 'Profissional não trabalha neste dia'
        }
      })
    }

    console.log('✅ API Dashboard - Horário de funcionamento encontrado:', {
      startTime: professionalSchedule.startTime,
      endTime: professionalSchedule.endTime,
      breaksCount: professionalSchedule.recurringBreaks.length
    })

    // 2. BUSCAR EXCEÇÕES/BLOQUEIOS PARA O DIA
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        professionalId: professionalIdParam,
        OR: [
          {
            startDatetime: {
              gte: toLocalISOString(startOfDay),
              lte: toLocalISOString(endOfDay)
            }
          },
          {
            endDatetime: {
              gte: toLocalISOString(startOfDay),
              lte: toLocalISOString(endOfDay)
            }
          },
          {
            AND: [
              { startDatetime: { lte: toLocalISOString(startOfDay) } },
              { endDatetime: { gte: toLocalISOString(endOfDay) } }
            ]
          }
        ]
      }
    })

    console.log('🚫 API Dashboard - Exceções/Bloqueios encontrados:', {
      count: exceptions.length,
      exceptions: exceptions.map(ex => ({
        id: ex.id,
        start: ex.startDatetime.toISOString(),
        end: ex.endDatetime.toISOString(),
        reason: ex.reason,
        type: ex.type
      }))
    })

    // 3. BUSCAR AGENDAMENTOS EXISTENTES (MESMA LÓGICA DA API PÚBLICA)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: professionalIdParam,
        tenantId: user.tenantId,
        dateTime: {
          gte: toLocalISOString(startOfDay),
          lte: toLocalISOString(endOfDay)
        },
        status: {
          in: ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS', 'SCHEDULED']
        }
      },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        status: true
      }
    })

    console.log('📅 API Dashboard - Agendamentos existentes encontrados:', {
      count: existingAppointments.length,
      appointments: existingAppointments.map(apt => ({
        id: apt.id,
        dateTime: apt.dateTime.toISOString(),
        duration: apt.duration,
        status: apt.status,
        localTime: extractTimeFromDateTime(apt.dateTime.toISOString())
      }))
    })

    // 4. GERAR SLOTS DISPONÍVEIS
    const availableTimes: string[] = []
    const intervalMinutes = 5

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
      
      let isSlotAvailable = true

      // Verificar se há slots suficientes até o fim do expediente
      if (currentMinutes + serviceDurationMinutes > endTotalMinutes) {
        continue
      }

      // A. VERIFICAR CONFLITO COM INTERVALOS RECORRENTES
      for (let checkMinutes = currentMinutes; checkMinutes < currentMinutes + serviceDurationMinutes; checkMinutes += intervalMinutes) {
        for (const recurringBreak of professionalSchedule.recurringBreaks) {
          const [breakStartHour, breakStartMinute] = recurringBreak.startTime.split(':').map(Number)
          const [breakEndHour, breakEndMinute] = recurringBreak.endTime.split(':').map(Number)
          
          const breakStartMinutes = breakStartHour * 60 + breakStartMinute
          const breakEndMinutes = breakEndHour * 60 + breakEndMinute
          
          if (checkMinutes >= breakStartMinutes && checkMinutes < breakEndMinutes) {
            console.log(`🚫 API Dashboard - Slot ${timeSlot} conflita com intervalo:`, {
              breakStart: recurringBreak.startTime,
              breakEnd: recurringBreak.endTime
            })
            isSlotAvailable = false
            break
          }
        }
        if (!isSlotAvailable) break
      }

      // B. VERIFICAR CONFLITO COM EXCEÇÕES/BLOQUEIOS
      if (isSlotAvailable) {
        const slotStartDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
        const slotEndDateTime = new Date(slotStartDateTime.getTime() + (serviceDurationMinutes * 60000))
        
        for (const exception of exceptions) {
          const exceptionStart = new Date(exception.startDatetime)
          const exceptionEnd = new Date(exception.endDatetime)
          
          if (slotStartDateTime < exceptionEnd && slotEndDateTime > exceptionStart) {
            console.log(`🚫 API Dashboard - Slot ${timeSlot} conflita com exceção:`, {
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

      // C. VERIFICAR CONFLITO COM AGENDAMENTOS EXISTENTES
      if (isSlotAvailable) {
        const slotStartDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
        const slotEndDateTime = new Date(slotStartDateTime.getTime() + (serviceDurationMinutes * 60000))
        
        for (const appointment of existingAppointments) {
          const appointmentStart = new Date(appointment.dateTime)
          const appointmentDurationMinutes = appointment.duration || 30
          const appointmentEnd = new Date(appointmentStart.getTime() + (appointmentDurationMinutes * 60000))
          
          if (slotStartDateTime < appointmentEnd && slotEndDateTime > appointmentStart) {
            console.log(`⚠️ API Dashboard - Slot ${timeSlot} conflita com agendamento:`, {
              appointmentStart: appointmentStart.toISOString(),
              appointmentEnd: appointmentEnd.toISOString(),
              slotStart: slotStartDateTime.toISOString(),
              slotEnd: slotEndDateTime.toISOString(),
              appointmentId: appointment.id
            })
            isSlotAvailable = false
            break
          }
        }
      }

      if (isSlotAvailable) {
        availableTimes.push(timeSlot)
      }
    }

    console.log('✅ API Dashboard - Disponibilidade calculada:', {
      professional: professional.name,
      date: dateParam,
      total_slots: availableTimes.length,
      working_hours: `${professionalSchedule.startTime} - ${professionalSchedule.endTime}`,
      breaks_count: professionalSchedule.recurringBreaks.length,
      exceptions_count: exceptions.length,
      appointments_count: existingAppointments.length,
      available_times_sample: availableTimes.slice(0, 10),
      service_duration_minutes: serviceDurationMinutes
    })

    return NextResponse.json({
      professional_id: professionalIdParam,
      professional_name: professional.name,
      date: dateParam,
      available_times: availableTimes,
      metadata: {
        working_hours: {
          start_time: professionalSchedule.startTime,
          end_time: professionalSchedule.endTime,
          is_open: true
        },
        breaks: professionalSchedule.recurringBreaks.map(rb => ({
          start_time: rb.startTime,
          end_time: rb.endTime,
          reason: 'Intervalo'
        })),
        exceptions: exceptions.map(ex => ({
          id: ex.id,
          start_datetime: ex.startDatetime.toISOString(),
          end_datetime: ex.endDatetime.toISOString(),
          reason: ex.reason || 'Bloqueio',
          type: ex.type
        })),
        appointments: existingAppointments.length,
        service_duration: serviceDurationMinutes
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
