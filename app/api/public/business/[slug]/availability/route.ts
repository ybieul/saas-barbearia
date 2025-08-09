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

    // Converter data recebida (YYYY-MM-DD) para range de datas
    const targetDate = new Date(date)
    
    // Criar range de início e fim do dia em UTC
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Buscar agendamentos para a data específica
    const whereClause: any = {
      tenantId: business.id,
      dateTime: {
        gte: startOfDay,
        lte: endOfDay
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
      // 🇧🇷 CORREÇÃO: Parse direto do objeto Date do banco (já está em horário brasileiro)
      const aptStartTime = extractTimeFromDateTime(toLocalISOString(apt.dateTime))
      
      return {
        id: apt.id,
        professionalId: apt.professionalId,
        startTime: aptStartTime, // HH:mm em horário brasileiro
        duration: apt.duration || 30, // usar duração salva no agendamento
        dateTime: apt.dateTime
      }
    })

    return NextResponse.json({
      date,
      professionalId,
      occupiedSlots
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
