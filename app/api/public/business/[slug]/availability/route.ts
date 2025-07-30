import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { utcToBrazil, parseDate, toBrazilDateString } from '@/lib/timezone'

// GET - Buscar disponibilidade de horários para um profissional em uma data
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const professionalId = searchParams.get('professionalId')
    const date = searchParams.get('date') // formato YYYY-MM-DD
    const serviceDuration = Number(searchParams.get('serviceDuration')) || 30

    console.log('🔍 Verificando disponibilidade:', { slug, professionalId, date, serviceDuration })

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

    // Validar formato da data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Buscar tenant por ID ou email
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

    // Se um profissional específico foi informado, verificar se existe
    if (professionalId && professionalId !== 'null') {
      const professional = await prisma.professional.findFirst({
        where: {
          id: professionalId,
          tenantId: business.id,
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

    // Converter data para faixa UTC para busca no banco
    // date está em formato YYYY-MM-DD (ex: "2025-07-30")
    const [year, month, day] = date.split('-').map(Number)
    
    // Criar data no timezone brasileiro (America/Sao_Paulo)
    const startOfDayBrazil = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDayBrazil = new Date(year, month - 1, day, 23, 59, 59, 999)
    
    // Converter para UTC (subtraindo 3 horas do fuso horário brasileiro)
    const startOfDayUTC = new Date(startOfDayBrazil.getTime() + (3 * 60 * 60 * 1000))
    const endOfDayUTC = new Date(endOfDayBrazil.getTime() + (3 * 60 * 60 * 1000))

    console.log('🕐 Faixa de busca UTC:', { 
      startOfDayUTC: startOfDayUTC.toISOString(), 
      endOfDayUTC: endOfDayUTC.toISOString() 
    })

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

    console.log('🔍 Buscando agendamentos com critério:', whereClause)

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

    console.log(`📅 Encontrados ${existingAppointments.length} agendamentos existentes`)

    // Converter agendamentos para timezone brasileiro e calcular bloqueios
    const occupiedSlots = new Set<string>()

    existingAppointments.forEach((appointment, index) => {
      try {
        // Converter de UTC para timezone brasileiro
        const appointmentTimeBrazil = utcToBrazil(appointment.dateTime)
        const startHour = appointmentTimeBrazil.getHours()
        const startMinute = appointmentTimeBrazil.getMinutes()
        const duration = appointment.service?.duration || 30

        console.log(`⏰ Agendamento ${index + 1}:`, {
          originalUTC: appointment.dateTime.toISOString(),
          convertedBrazil: appointmentTimeBrazil.toISOString(),
          time: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
          duration
        })

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
      } catch (error) {
        console.error('❌ Erro ao processar agendamento:', appointment.id, error)
      }
    })

    // Retornar lista de slots ocupados
    const occupiedSlotsArray = Array.from(occupiedSlots)
    console.log('🚫 Slots ocupados:', occupiedSlotsArray)

    return NextResponse.json({
      occupiedSlots: occupiedSlotsArray,
      totalAppointments: existingAppointments.length,
      date,
      professionalId: professionalId || 'all',
      debug: {
        searchRange: {
          startUTC: startOfDayUTC.toISOString(),
          endUTC: endOfDayUTC.toISOString()
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    console.error('❌ Stack trace:', error.stack)
    
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor ao verificar disponibilidade',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
