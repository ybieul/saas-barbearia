import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { format, parseISO, getDay, startOfDay, endOfDay, addMinutes, isSameDay } from 'date-fns'
import { generateTimeSlots, timePeriodsOverlap, toSystemTimezone } from '@/lib/schedule-utils'
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

    // PASSO 2: Gerar slots iniciais baseados no horário de trabalho
    const initialSlots = generateTimeSlots(
      schedule.startTime.substring(0, 5), // Remover segundos se houver (HH:MM)
      schedule.endTime.substring(0, 5),
      5, // ✅ CORRIGIDO: Slots de 5 em 5 minutos
      serviceDuration
    )

    // PASSO 2.5: Remover slots que estão dentro dos intervalos recorrentes (como almoço)
    const recurringBreaks = await prisma.recurringBreak.findMany({
      where: {
        scheduleId: schedule.id
      }
    })

    let availableSlotsAfterBreaks = initialSlots.filter(slotTime => {
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
        dateTime: true,
        duration: true
      }
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

    // PASSO 5: Processar slots e marcar indisponibilidade
    const availableSlots: AvailabilitySlot[] = availableSlotsAfterBreaks.map(time => {
      const [hours, minutes] = time.split(':').map(Number)
      const slotStart = new Date(targetDate)
      slotStart.setHours(hours, minutes, 0, 0)
      const slotEnd = addMinutes(slotStart, serviceDuration)

      let available = true
      let reason: string | undefined

      // Verificar conflito com agendamentos
      for (const appointment of existingAppointments) {
        const appointmentEnd = addMinutes(appointment.dateTime, appointment.duration)
        
        if (timePeriodsOverlap(slotStart, slotEnd, appointment.dateTime, appointmentEnd)) {
          available = false
          reason = 'Agendado'
          break
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
        time,
        available,
        reason
      }
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
        startTime: schedule.startTime,
        endTime: schedule.endTime
      },
      slots: availableSlots
    } as DayAvailability)

  } catch (error) {
    console.error('Erro ao calcular disponibilidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
