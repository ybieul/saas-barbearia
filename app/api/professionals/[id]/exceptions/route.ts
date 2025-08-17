import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkConflictingAppointments, toSystemTimezone } from '@/lib/schedule-utils'
import { parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
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

    // 🔍 DEBUG - Verificar timezone do MySQL e configurações
    console.log('=== AUDITORIA TIMEZONE - PONTO 0: CONFIG DO SISTEMA ===')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 'INDEFINIDA')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('Sistema TZ:', process.env.TZ || 'sistema padrão')
    console.log('Data atual do servidor:', new Date().toString())
    
    const timezoneResult = await prisma.$queryRaw<{timezone: string}[]>`SELECT @@session.time_zone as timezone`
    console.log('MySQL session timezone:', timezoneResult)

    // 🔍 PONTO B - DADOS RECEBIDOS NO BACKEND (PRIMEIRA COISA QUE FAZEMOS)
    console.log('=== PONTO B - DADOS RECEBIDOS NO BACKEND ===')
    console.log('Backend request.body RAW:', JSON.stringify(body, null, 2))
    console.log('Backend body.startDatetime:', body.startDatetime)
    console.log('Backend body.endDatetime:', body.endDatetime)
    console.log('Backend typeof body.startDatetime:', typeof body.startDatetime)
    console.log('Backend typeof body.endDatetime:', typeof body.endDatetime)

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
      // 🔍 DEBUG - Verificar parsing de datas
      console.log('=== AUDITORIA TIMEZONE - PONTO 2: PARSING DE DATAS ===')
      
      // Receber strings no formato "YYYY-MM-DD HH:MM:SS" e criar Date local do Brasil
      if (typeof startDatetime === 'string') {
        console.log('Processando startDatetime como string:', startDatetime)
        
        // Parse manual para garantir interpretação como horário local
        const [datePart, timePart] = startDatetime.split(' ')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute, second = 0] = timePart.split(':').map(Number)
        
        console.log('Componentes extraídos - Year:', year, 'Month:', month, 'Day:', day, 'Hour:', hour, 'Minute:', minute, 'Second:', second)
        
        startDateTime = new Date(year, month - 1, day, hour, minute, second)
        console.log('Date criado (startDateTime):', startDateTime)
        console.log('startDateTime.toString():', startDateTime.toString())
        console.log('startDateTime.toISOString():', startDateTime.toISOString())
        console.log('startDateTime.getHours():', startDateTime.getHours())
        console.log('startDateTime.getTimezoneOffset():', startDateTime.getTimezoneOffset())
      } else {
        startDateTime = startDatetime
      }

      if (typeof endDatetime === 'string') {
        console.log('Processando endDatetime como string:', endDatetime)
        
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

    // 🔍 PONTO C - DADOS ANTES DE SALVAR NO BANCO (MAIS IMPORTANTE!)
    console.log('=== PONTO C - DADOS IMEDIATAMENTE ANTES DO PRISMA ===')
    
    const dataToSave = {
      professionalId,
      startDatetime: startDateTime,
      endDatetime: endDateTime,
      reason: reason?.trim() || null,
      type
    }
    
    console.log('PONTO C - Objeto COMPLETO que será salvo:', JSON.stringify(dataToSave, null, 2))
    console.log('PONTO C - startDateTime objeto Date:', startDateTime)
    console.log('PONTO C - startDateTime.toString():', startDateTime.toString())
    console.log('PONTO C - startDateTime.getHours():', startDateTime.getHours())
    console.log('PONTO C - startDateTime.getMinutes():', startDateTime.getMinutes())
    console.log('PONTO C - startDateTime.toISOString():', startDateTime.toISOString())
    console.log('PONTO C - startDateTime.getTimezoneOffset():', startDateTime.getTimezoneOffset())
    console.log('PONTO C - Sistema timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone)

    // AQUI É ONDE PODE ESTAR ACONTECENDO A CONVERSÃO!
    console.log('PONTO C - EXECUTANDO PRISMA.CREATE AGORA...')
    const exception = await prisma.scheduleException.create({
      data: dataToSave
    })
    console.log('PONTO C - PRISMA.CREATE EXECUTADO!')

    // 🔍 PONTO D - DADOS DEPOIS DO BANCO
    console.log('=== PONTO D - DADOS RETORNADOS DO BANCO ===')
    console.log('PONTO D - Dados retornados:', JSON.stringify(exception, null, 2))
    console.log('PONTO D - exception.startDatetime:', exception.startDatetime)
    console.log('PONTO D - typeof exception.startDatetime:', typeof exception.startDatetime)
    if (exception.startDatetime instanceof Date) {
      console.log('PONTO D - exception.startDatetime.toString():', exception.startDatetime.toString())
      console.log('PONTO D - exception.startDatetime.getHours():', exception.startDatetime.getHours())
    }

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
