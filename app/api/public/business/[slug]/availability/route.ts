
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { utcToBrazil, parseDate } from '@/lib/timezone'

// GET - Verificar disponibilidade de horários
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const serviceId = searchParams.get('serviceId')
    const date = searchParams.get('date')
    const serviceDurationParam = searchParams.get('serviceDuration')

    // Validações
    if (!slug) {
      return NextResponse.json(
        { message: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    if (!date || !serviceDurationParam) {
      return NextResponse.json(
        { message: 'Data e duração do serviço são obrigatórios' },
        { status: 400 }
      )
    }

    const serviceDuration = parseInt(serviceDurationParam)
    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      return NextResponse.json(
        { message: 'Duração do serviço deve ser um número positivo' },
        { status: 400 }
      )
    }

    // Verificar se tenant existe
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: slug },
          { email: slug }
        ],
        isActive: true
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se profissional pertence ao tenant (quando especificado)
    if (professionalId) {
      const professional = await prisma.professional.findFirst({
        where: {
          id: professionalId,
          tenantId: tenant.id,
          isActive: true
        }
      })

      if (!professional) {
        return NextResponse.json(
          { message: 'Profissional não encontrado' },
          { status: 404 }
        )
      }
    }

    // Converter data para timezone brasileiro e calcular range UTC
    const selectedDateBrazil = parseDate(date)
    
    // Início do dia em timezone brasileiro (00:00:00)
    const startOfDayBrazil = new Date(selectedDateBrazil)
    startOfDayBrazil.setHours(0, 0, 0, 0)
    
    // Fim do dia em timezone brasileiro (23:59:59)
    const endOfDayBrazil = new Date(selectedDateBrazil)
    endOfDayBrazil.setHours(23, 59, 59, 999)
    
    // Converter para UTC para busca no banco
    const startOfDayUTC = new Date(startOfDayBrazil.getTime() - (3 * 60 * 60 * 1000)) // -3h para UTC
    const endOfDayUTC = new Date(endOfDayBrazil.getTime() - (3 * 60 * 60 * 1000)) // -3h para UTC

    // Buscar agendamentos do dia
    const whereClause: any = {
      tenantId: tenant.id,
      dateTime: {
        gte: startOfDayUTC,
        lte: endOfDayUTC
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      }
    }

    // Filtrar por profissional se especificado
    if (professionalId) {
      whereClause.professionalId = professionalId
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: {
          select: {
            duration: true
          }
        }
      }
    })

    console.log(`🔍 Buscando disponibilidade para ${date}:`, {
      professionalId,
      serviceId,
      serviceDuration,
      appointmentsFound: appointments.length,
      utcRange: {
        start: startOfDayUTC.toISOString(),
        end: endOfDayUTC.toISOString()
      }
    })

    // Calcular slots ocupados
    const occupiedSlots: string[] = []

    for (const appointment of appointments) {
      // Converter horário do agendamento de UTC para timezone brasileiro
      const appointmentBrazilTime = utcToBrazil(appointment.dateTime)
      
      // Duração do agendamento existente
      const appointmentDuration = appointment.service?.duration || 30
      
      // Calcular todos os slots de 5 minutos ocupados por este agendamento
      const startHour = appointmentBrazilTime.getHours()
      const startMinute = appointmentBrazilTime.getMinutes()
      let currentTimeInMinutes = startHour * 60 + startMinute
      const endTimeInMinutes = currentTimeInMinutes + appointmentDuration
      
      // Gerar slots ocupados de 5 em 5 minutos
      while (currentTimeInMinutes < endTimeInMinutes) {
        const hour = Math.floor(currentTimeInMinutes / 60)
        const minute = currentTimeInMinutes % 60
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        if (!occupiedSlots.includes(timeSlot)) {
          occupiedSlots.push(timeSlot)
        }
        
        currentTimeInMinutes += 5
      }
    }

    // Ordenar slots ocupados
    occupiedSlots.sort()

    console.log(`✅ Slots ocupados calculados:`, occupiedSlots)

    return NextResponse.json({
      date,
      professionalId,
      serviceId,
      serviceDuration,
      occupiedSlots,
      appointmentsCount: appointments.length
    })

  } catch (error: any) {
    console.error('❌ Erro ao verificar disponibilidade:', error)
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
