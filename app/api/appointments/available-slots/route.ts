import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { utcToBrazil, brazilToUtc } from '@/lib/timezone'

const prisma = new PrismaClient()

/**
 * API para calcular horários disponíveis para agendamento
 * POST /api/appointments/available-slots
 * 
 * Body: {
 *   date: string (ISO UTC),
 *   professionalId: string,
 *   serviceDuration: number (minutos),
 *   excludeAppointmentId?: string (para edição)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, professionalId, serviceDuration, excludeAppointmentId } = body

    if (!date || !professionalId || !serviceDuration) {
      return NextResponse.json({
        error: 'Data, profissional e duração do serviço são obrigatórios'
      }, { status: 400 })
    }

    // Converter data UTC para horário do Brasil
    const selectedDate = new Date(date)
    const brazilDate = utcToBrazil(selectedDate)
    
    // Extrair informações da data no Brasil
    const dayOfWeek = brazilDate.getDay() // 0 = Domingo, 1 = Segunda, etc.
    
    // Converter número do dia para string (WorkingHours usa string)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeekStr = dayNames[dayOfWeek]
    
    console.log('🕐 Calculando horários disponíveis:', {
      dateUTC: selectedDate.toISOString(),
      dateBrazil: brazilDate.toISOString(),
      dayOfWeek: dayOfWeekStr,
      professionalId,
      serviceDuration
    })

    // 1. Buscar horário de funcionamento para este dia (da barbearia, não do profissional)
    // O schema atual não tem WorkingHours vinculado ao professional, mas sim ao tenant
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { tenantId: true }
    })

    if (!professional) {
      return NextResponse.json({
        error: 'Profissional não encontrado'
      }, { status: 404 })
    }

    const workingHours = await prisma.workingHours.findFirst({
      where: {
        tenantId: professional.tenantId,
        dayOfWeek: dayOfWeekStr,
        isActive: true
      }
    })

    if (!workingHours) {
      console.log('❌ Profissional não trabalha neste dia')
      return NextResponse.json([])
    }

    console.log('✅ Horário de funcionamento encontrado:', {
      startTime: workingHours.startTime,
      endTime: workingHours.endTime
    })

    // 2. Buscar agendamentos existentes para este profissional nesta data
    const startOfDay = new Date(brazilDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(brazilDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Converter para UTC para buscar no banco
    const startOfDayUTC = brazilToUtc(startOfDay)
    const endOfDayUTC = brazilToUtc(endOfDay)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        dateTime: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'] // Não considerar cancelados
        },
        // Excluir agendamento sendo editado
        ...(excludeAppointmentId && {
          id: { not: excludeAppointmentId }
        })
      },
      include: {
        services: {
          select: {
            duration: true
          }
        }
      }
    })

    console.log('📅 Agendamentos existentes:', existingAppointments.length)

    // 3. Converter horários de funcionamento para minutos
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number)
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number)
    
    const workStartMinutes = startHour * 60 + startMin
    const workEndMinutes = endHour * 60 + endMin
    
    // 4. Criar slots de tempo (intervalo padrão: 30 minutos)
    const slotInterval = 30 // minutos
    const availableSlots: string[] = []
    
    for (let minutes = workStartMinutes; minutes + serviceDuration <= workEndMinutes; minutes += slotInterval) {
      const slotStartMinutes = minutes
      const slotEndMinutes = minutes + serviceDuration
      
      // Verificar se há conflito com agendamentos existentes
      let hasConflict = false
      
      for (const appointment of existingAppointments) {
        const appointmentDate = utcToBrazil(appointment.dateTime)
        const appointmentStartMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes()
        
        // Calcular duração do agendamento (soma de todos os serviços)
        const totalDuration = appointment.services.reduce((sum: number, service: any) => 
          sum + (service.duration || 60), 0
        )
        
        const appointmentEndMinutes = appointmentStartMinutes + totalDuration
        
        // Verificar sobreposição
        if (slotStartMinutes < appointmentEndMinutes && slotEndMinutes > appointmentStartMinutes) {
          hasConflict = true
          break
        }
      }
      
      if (!hasConflict) {
        // Converter minutos de volta para HH:MM
        const hours = Math.floor(slotStartMinutes / 60)
        const mins = slotStartMinutes % 60
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        availableSlots.push(timeString)
      }
    }

    console.log('⏰ Horários disponíveis calculados:', availableSlots.length)

    return NextResponse.json(availableSlots)

  } catch (error) {
    console.error('❌ Erro ao calcular horários disponíveis:', error)
    
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
