import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseDateTime, extractTimeFromDateTime, toLocalISOString } from '@/lib/timezone'

// GET - Buscar horários ocupados para um profissional em uma data específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const professionalId = searchParams.get('professionalId')

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

    // Buscar tenant por customLink
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
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }

    // 🇧🇷 CORREÇÃO: Converter data recebida (YYYY-MM-DD) para range brasileiro
    const [year, month, day] = date.split('-').map(Number)
    
    // Criar range de início e fim do dia em timezone brasileiro
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Buscar agendamentos para a data específica
    const whereClause: any = {
      tenantId: business.id,
      dateTime: {
        gte: toLocalISOString(startOfDay),
        lte: toLocalISOString(endOfDay)
      },
      status: {
        in: ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS']
      }
    }

    // Filtrar por profissional se especificado
    if (professionalId && professionalId !== 'null' && professionalId !== 'undefined') {
      whereClause.professionalId = professionalId
    }
    // Para "qualquer profissional" (null), buscar agendamentos de TODOS os profissionais

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        dateTime: true,
        duration: true,
        professionalId: true
      },
      orderBy: {
        dateTime: 'asc'
      }
    })

    // Processar agendamentos para retornar apenas os dados necessários
    const occupiedSlots = appointments.map(apt => {
      // 🇧🇷 CORREÇÃO CRÍTICA: Usar extractTimeFromDateTime com toISOString para evitar problema UTC
      const aptStartTime = extractTimeFromDateTime(apt.dateTime.toISOString())
      
      return {
        id: apt.id,
        professionalId: apt.professionalId,
        startTime: aptStartTime, // HH:mm em horário brasileiro correto
        duration: apt.duration || 30, // usar duração salva no agendamento
        dateTime: apt.dateTime
      }
    })

    // 🔧 NOVA FUNCIONALIDADE: Buscar exceções/bloqueios para a data
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        ...(professionalId && professionalId !== 'null' && professionalId !== 'undefined' ? {
          professionalId
        } : {}), // Se não tem profissional específico, buscar exceções de todos
        OR: [
          {
            // Exceções que começam no dia
            startDatetime: {
              gte: toLocalISOString(startOfDay),
              lte: toLocalISOString(endOfDay)
            }
          },
          {
            // Exceções que terminam no dia
            endDatetime: {
              gte: toLocalISOString(startOfDay),
              lte: toLocalISOString(endOfDay)
            }
          },
          {
            // Exceções que cobrem o dia inteiro
            AND: [
              { startDatetime: { lte: toLocalISOString(startOfDay) } },
              { endDatetime: { gte: toLocalISOString(endOfDay) } }
            ]
          }
        ]
      }
    })

    // 🔧 FUNÇÃO DE CORREÇÃO: Ajustar timezone das exceções (copiada da API v2)
    const adjustExceptionTimezone = (exceptionDate: Date): Date => {
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
            correctedBRT: correctedDate.toLocaleString('pt-BR')
          })
        }
        
        return correctedDate
      }
      
      return exceptionDate
    }

    // 🔧 PROCESSAR EXCEÇÕES: Converter para formato de slots bloqueados
    const blockedSlots = exceptions.map(exception => {
      // Aplicar correção de timezone
      const correctedStartException = adjustExceptionTimezone(exception.startDatetime)
      const correctedEndException = adjustExceptionTimezone(exception.endDatetime)
      
      const startTime = extractTimeFromDateTime(correctedStartException.toISOString())
      const duration = Math.round((correctedEndException.getTime() - correctedStartException.getTime()) / (1000 * 60)) // em minutos
      
      return {
        id: `exception-${exception.id}`,
        professionalId: exception.professionalId,
        startTime,
        duration,
        dateTime: correctedStartException,
        type: 'exception',
        reason: exception.reason || (exception.type === 'DAY_OFF' ? 'Folga' : 'Bloqueado')
      }
    })

    // 🔧 COMBINAR agendamentos e exceções
    const allOccupiedSlots = [
      ...occupiedSlots.map(slot => ({ ...slot, type: 'appointment' })),
      ...blockedSlots
    ]

    // 🔍 DEBUG em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [AVAILABILITY-API] Dados processados:', {
        date,
        professionalId,
        appointmentsFound: occupiedSlots.length,
        exceptionsFound: blockedSlots.length,
        totalOccupiedSlots: allOccupiedSlots.length,
        exceptions: exceptions.map(exc => ({
          id: exc.id,
          startDatetime: exc.startDatetime.toISOString(),
          endDatetime: exc.endDatetime.toISOString(),
          reason: exc.reason,
          type: exc.type
        }))
      })
    }

    return NextResponse.json({
      date,
      professionalId,
      occupiedSlots: allOccupiedSlots, // ✅ Agora inclui agendamentos + exceções
      // 🔧 Dados adicionais para compatibilidade
      appointmentsCount: occupiedSlots.length,
      exceptionsCount: blockedSlots.length,
      totalBlockedSlots: allOccupiedSlots.length
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
