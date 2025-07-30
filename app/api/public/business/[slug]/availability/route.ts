import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { utcToBrazil, parseDate, toBrazilDateString } from '@/lib/timezone'

// GET - Buscar disponibilidade de horários para um profissional em uma data
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const date = searchParams.get('date') // formato YYYY-MM-DD
    const serviceDuration = Number(searchParams.get('serviceDuration')) || 30

    if (!slug) {
      return NextResponse.json(
        { message: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { message: 'Data é obrigatória' },
        { status: 400 }
      )
    }

    // Buscar tenant por ID
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: slug },
          { email: slug }
        ],
        isActive: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }

    // Converter data brasileira para UTC para busca no banco
    const selectedDate = parseDate(date)
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Converter para UTC para consulta no banco
    const startOfDayUTC = new Date(startOfDay.getTime() - (3 * 60 * 60 * 1000)) // -3h para UTC
    const endOfDayUTC = new Date(endOfDay.getTime() - (3 * 60 * 60 * 1000)) // -3h para UTC

    // Buscar agendamentos existentes na data
    const whereClause: any = {
      tenantId: business.id,
      dateTime: {
        gte: startOfDayUTC,
        lte: endOfDayUTC
      },
      status: {
        in: ['confirmed', 'completed'] // Não incluir cancelados
      }
    }

    // Se um profissional específico foi selecionado, filtrar por ele
    if (professionalId && professionalId !== 'null') {
      whereClause.professionalId = professionalId
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: {
          select: {
            duration: true
          }
        }
      }
    })

    // Converter agendamentos para timezone brasileiro e calcular bloqueios
    const occupiedSlots = new Set<string>()

    existingAppointments.forEach(appointment => {
      // Converter de UTC para timezone brasileiro
      const appointmentTimeBrazil = utcToBrazil(appointment.dateTime)
      const startHour = appointmentTimeBrazil.getHours()
      const startMinute = appointmentTimeBrazil.getMinutes()
      const duration = appointment.service?.duration || 30

      // Calcular todos os slots ocupados (de 5 em 5 minutos)
      let currentTime = startHour * 60 + startMinute // em minutos
      const endTime = currentTime + duration

      while (currentTime < endTime) {
        const hour = Math.floor(currentTime / 60)
        const minute = currentTime % 60
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        occupiedSlots.add(timeSlot)
        currentTime += 5 // incrementar 5 minutos
      }
    })

    // Retornar lista de slots ocupados
    return NextResponse.json({
      occupiedSlots: Array.from(occupiedSlots),
      totalAppointments: existingAppointments.length
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
