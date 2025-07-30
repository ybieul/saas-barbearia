import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔧 API Pública de Disponibilidade - Versão Robusta
 * 
 * Retorna todos os horários possíveis do dia (de 5 em 5 min) com flag de ocupado
 * Funciona com dados reais em produção
 */

// GET - Buscar disponibilidade de horários
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

    console.log('🔍 API Disponibilidade:', { slug, professionalId, date, serviceDuration })

    // ===== VALIDAÇÕES BÁSICAS =====
    if (!slug) {
      return NextResponse.json({ error: 'Slug é obrigatório' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 400 })
    }

    // ===== BUSCAR TENANT =====
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: slug },
          { email: slug }
        ],
        isActive: true
      },
      select: {
        id: true,
        businessName: true
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })
    }

    // ===== BUSCAR HORÁRIOS DE FUNCIONAMENTO =====
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    const dayOfWeek = targetDate.getDay() // 0=domingo, 1=segunda, etc.

    // Converter número do dia da semana para string (formato do banco)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]

    console.log('📅 Data alvo:', { date, dayOfWeek, dayName })

    const workingHours = await prisma.workingHours.findFirst({
      where: {
        tenantId: business.id,
        dayOfWeek: dayName,
        isActive: true
      },
      select: {
        startTime: true,
        endTime: true
      }
    })

    if (!workingHours) {
      // Se não há horário de funcionamento, retornar todos os horários como ocupados
      const allTimeSlots = []
      
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          allTimeSlots.push({
            hora: timeSlot,
            ocupado: true // Todos ocupados se estabelecimento fechado
          })
        }
      }

      return NextResponse.json({
        horarios: allTimeSlots,
        date,
        professionalId: professionalId || 'all',
        totalAppointments: 0,
        workingHours: null,
        businessName: business.businessName,
        message: 'Estabelecimento fechado neste dia'
      })
    }

    // ===== VALIDAR PROFISSIONAL (se especificado) =====
    if (professionalId && professionalId !== 'null' && professionalId !== '') {
      const professional = await prisma.professional.findFirst({
        where: {
          id: professionalId,
          tenantId: business.id,
          isActive: true
        },
        select: { id: true, name: true }
      })

      if (!professional) {
        return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
      }
      console.log('👨‍💼 Profissional encontrado:', professional.name)
    }

    // ===== GERAR FAIXA DE HORÁRIOS DISPONÍVEIS =====
    const startTime = workingHours.startTime // formato "HH:MM"
    const endTime = workingHours.endTime     // formato "HH:MM"
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    console.log('🕐 Horário funcionamento:', { startTime, endTime, startMinutes, endMinutes })

    // ===== BUSCAR AGENDAMENTOS EXISTENTES =====
    // Criar faixa UTC para busca no banco (banco armazena em UTC)
    const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 3, 0, 0)) // 00:00 Brasil = 03:00 UTC
    const endOfDayUTC = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59)) // 23:59 Brasil = 02:59 UTC+1

    const appointmentWhere: any = {
      tenantId: business.id,
      dateTime: {
        gte: startOfDayUTC,
        lte: endOfDayUTC
      },
      status: {
        in: ['confirmed', 'completed']
      }
    }

    // Filtrar por profissional se especificado
    if (professionalId && professionalId !== 'null' && professionalId !== '') {
      appointmentWhere.professionalId = professionalId
    }

    console.log('🔍 Buscando agendamentos:', appointmentWhere)

    const existingAppointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      include: {
        service: {
          select: {
            duration: true,
            name: true
          }
        },
        professional: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`� Encontrados ${existingAppointments.length} agendamentos`)

    // ===== MAPEAR HORÁRIOS OCUPADOS =====
    const occupiedSlots = new Set<string>()

    existingAppointments.forEach((appointment, index) => {
      try {
        // Converter UTC para horário brasileiro (subtrair 3 horas)
        const utcTime = new Date(appointment.dateTime)
        const brazilTime = new Date(utcTime.getTime() - (3 * 60 * 60 * 1000))
        
        const appointmentHour = brazilTime.getHours()
        const appointmentMinute = brazilTime.getMinutes()
        const duration = appointment.service?.duration || 30

        console.log(`⏰ Agendamento ${index + 1}:`, {
          service: appointment.service?.name,
          professional: appointment.professional?.name,
          utc: utcTime.toISOString(),
          brazil: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`,
          duration: `${duration}min`
        })

        // Marcar todos os slots ocupados baseado na duração
        let currentMinutes = appointmentHour * 60 + appointmentMinute
        const appointmentEndMinutes = currentMinutes + duration

        while (currentMinutes < appointmentEndMinutes) {
          const hour = Math.floor(currentMinutes / 60)
          const minute = currentMinutes % 60
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          occupiedSlots.add(timeSlot)
          currentMinutes += 5 // próximo slot de 5 minutos
        }

      } catch (err) {
        console.error('❌ Erro ao processar agendamento:', appointment.id, err)
      }
    })

    // ===== GERAR LISTA COMPLETA DE HORÁRIOS DO DIA =====
    const allTimeSlots = []
    
    // Gerar todos os horários possíveis de 5 em 5 minutos (00:00 até 23:55)
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Verificar se está dentro do horário de funcionamento
        const currentMinutes = hour * 60 + minute
        const isWithinWorkingHours = currentMinutes >= startMinutes && currentMinutes < endMinutes
        
        // Verificar se está ocupado
        const isOccupied = occupiedSlots.has(timeSlot)
        
        // Verificar se há tempo suficiente para o serviço (apenas para horários de funcionamento)
        const remainingMinutes = endMinutes - currentMinutes
        const hasEnoughTime = remainingMinutes >= serviceDuration
        
        allTimeSlots.push({
          hora: timeSlot,
          ocupado: isOccupied || !isWithinWorkingHours || !hasEnoughTime
        })
      }
    }

    console.log(`✅ Gerados ${allTimeSlots.length} horários (${occupiedSlots.size} ocupados)`)

    // ===== RESPOSTA FINAL (FORMATO SIMPLES PARA O FRONTEND) =====
    return NextResponse.json({
      horarios: allTimeSlots,
      date,
      professionalId: professionalId || 'all',
      totalAppointments: existingAppointments.length,
      workingHours: {
        start: startTime,
        end: endTime
      },
      businessName: business.businessName
    })

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO na API de disponibilidade:', error)
    console.error('❌ Stack trace:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Erro ao carregar disponibilidade',
        message: 'Tente novamente em alguns instantes',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
