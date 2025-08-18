import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkConflictingAppointments, toSystemTimezone } from '@/lib/schedule-utils'
import { parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
import { toLocalISOString } from '@/lib/timezone'
import type { CreateScheduleExceptionData } from '@/lib/types/schedule'

// GET - Buscar exceções do profissional por período
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id
    const { searchParams } = new URL(request.url)
    
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // Verificar se o profissional pertence ao tenant do usuário
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        tenantId: user.tenantId
      }
    })

    if (!professional) {
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Validar parâmetros de data
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'Parâmetros start_date e end_date são obrigatórios (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    let startDate: Date
    let endDate: Date

    try {
      startDate = startOfDay(parseISO(startDateParam))
      endDate = endOfDay(parseISO(endDateParam))
    } catch (error) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (isAfter(startDate, endDate)) {
      return NextResponse.json(
        { error: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      )
    }

    // Buscar exceções no período
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        professionalId,
        OR: [
          {
            // Exceções que começam no período
            startDatetime: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            // Exceções que terminam no período
            endDatetime: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            // Exceções que cobrem todo o período
            AND: [
              { startDatetime: { lte: startDate } },
              { endDatetime: { gte: endDate } }
            ]
          }
        ]
      },
      orderBy: {
        startDatetime: 'asc'
      }
    })

    return NextResponse.json({
      professionalId,
      professionalName: professional.name,
      period: {
        startDate: startDateParam,
        endDate: endDateParam
      },
      exceptions: exceptions.map((exception) => ({
        id: exception.id,
        startDatetime: exception.startDatetime,
        endDatetime: exception.endDatetime,
        reason: exception.reason,
        type: exception.type,
        createdAt: exception.createdAt,
        updatedAt: exception.updatedAt
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar exceções do profissional:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova exceção/bloqueio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id
    const body: CreateScheduleExceptionData = await request.json()

    // Verificar se o profissional pertence ao tenant do usuário
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        tenantId: user.tenantId
      }
    })

    if (!professional) {
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Validar dados de entrada
    const { startDatetime, endDatetime, reason, type } = body

    if (!startDatetime || !endDatetime) {
      return NextResponse.json(
        { error: 'startDatetime e endDatetime são obrigatórios' },
        { status: 400 }
      )
    }

    if (!type || !['BLOCK', 'DAY_OFF'].includes(type)) {
      return NextResponse.json(
        { error: 'type deve ser BLOCK ou DAY_OFF' },
        { status: 400 }
      )
    }

    let startDateTime: Date
    let endDateTime: Date

    try {
      // Receber strings no formato "YYYY-MM-DD HH:MM:SS" e criar Date local do Brasil
      if (typeof startDatetime === 'string') {
        // Parse manual para garantir interpretação como horário local
        const [datePart, timePart] = startDatetime.split(' ')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute, second = 0] = timePart.split(':').map(Number)
        
        startDateTime = new Date(year, month - 1, day, hour, minute, second)
      } else {
        startDateTime = startDatetime
      }

      if (typeof endDatetime === 'string') {
        // Parse manual para garantir interpretação como horário local
        const [datePart, timePart] = endDatetime.split(' ')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute, second = 0] = timePart.split(':').map(Number)
        
        endDateTime = new Date(year, month - 1, day, hour, minute, second)
      } else {
        endDateTime = endDatetime
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Formato de data/hora inválido. Use YYYY-MM-DD HH:MM:SS' },
        { status: 400 }
      )
    }

    if (isBefore(endDateTime, startDateTime)) {
      return NextResponse.json(
        { error: 'Data/hora de fim deve ser posterior à data/hora de início' },
        { status: 400 }
      )
    }

    if (isBefore(startDateTime, new Date())) {
      return NextResponse.json(
        { error: 'Não é possível criar bloqueios no passado' },
        { status: 400 }
      )
    }

    // VALIDAÇÃO CRÍTICA: Verificar conflitos com agendamentos confirmados
    const conflictingAppointments = await checkConflictingAppointments(
      professionalId,
      startDateTime,
      endDateTime
    )

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        {
          error: 'Existem agendamentos confirmados conflitantes com este período',
          conflictingAppointments: conflictingAppointments.map(app => ({
            id: app.id,
            dateTime: app.dateTime,
            duration: app.duration,
            clientName: app.clientName,
            serviceName: app.serviceName
          }))
        },
        { status: 409 } // Conflict
      )
    }

    // Converte Date objects para strings ISO brasileiras, evitando conversão UTC automática do Prisma
    const startDatetimeForSave = toLocalISOString(startDateTime)
    const endDatetimeForSave = toLocalISOString(endDateTime)
    
    const dataToSave = {
      professionalId,
      startDatetime: startDatetimeForSave,
      endDatetime: endDatetimeForSave,
      reason: reason?.trim() || null,
      type
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating exception with data:', dataToSave)
    }
    
    const exception = await prisma.scheduleException.create({
      data: dataToSave
    })

    return NextResponse.json({
      message: 'Bloqueio criado com sucesso',
      exception: {
        id: exception.id,
        professionalId: exception.professionalId,
        startDatetime: exception.startDatetime,
        endDatetime: exception.endDatetime,
        reason: exception.reason,
        type: exception.type,
        createdAt: exception.createdAt,
        updatedAt: exception.updatedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar exceção:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
