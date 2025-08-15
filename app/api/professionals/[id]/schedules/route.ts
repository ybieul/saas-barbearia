import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { isValidTimeFormat, normalizeTimeFormat, isValidTimeRange, timeToMinutes } from '@/lib/schedule-utils'
import type { ProfessionalScheduleData } from '@/lib/types/schedule'

// GET - Buscar horários padrão do profissional
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id

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

    // Buscar horários padrão com intervalos
    const schedules = await prisma.professionalSchedule.findMany({
      where: {
        professionalId
      },
      include: {
        recurringBreaks: true
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    // Criar array com todos os dias da semana (0-6)
    const weekSchedule = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek)
      return {
        dayOfWeek,
        startTime: schedule?.startTime || null,
        endTime: schedule?.endTime || null,
        isWorking: !!schedule,
        breaks: schedule?.recurringBreaks?.map(breakItem => ({
          startTime: breakItem.startTime,
          endTime: breakItem.endTime
        })) || []
      }
    })

    return NextResponse.json({
      professionalId,
      professionalName: professional.name,
      schedule: weekSchedule
    })

  } catch (error) {
    console.error('Erro ao buscar horários do profissional:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar horários padrão do profissional
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id
    const body = await request.json()

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
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Dados inválidos. Esperado um array de horários.' },
        { status: 400 }
      )
    }

    const scheduleData: ProfessionalScheduleData[] = body

    // Validar cada horário
    for (const schedule of scheduleData) {
      const { dayOfWeek, startTime, endTime, breaks } = schedule

      // Validar dia da semana
      if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: `Dia da semana inválido: ${dayOfWeek}. Deve ser entre 0 (Domingo) e 6 (Sábado).` },
          { status: 400 }
        )
      }

      // Validar formatos de tempo
      if (!isValidTimeFormat(startTime)) {
        return NextResponse.json(
          { error: `Formato de hora de início inválido: ${startTime}. Use HH:MM ou HH:MM:SS.` },
          { status: 400 }
        )
      }

      if (!isValidTimeFormat(endTime)) {
        return NextResponse.json(
          { error: `Formato de hora de fim inválido: ${endTime}. Use HH:MM ou HH:MM:SS.` },
          { status: 400 }
        )
      }

      // Validar se startTime < endTime
      if (!isValidTimeRange(startTime, endTime)) {
        return NextResponse.json(
          { error: `Hora de início (${startTime}) deve ser menor que hora de fim (${endTime}).` },
          { status: 400 }
        )
      }

      // Validar intervalos (breaks) se fornecidos
      if (breaks && breaks.length > 0) {
        for (const breakItem of breaks) {
          if (!isValidTimeFormat(breakItem.startTime)) {
            return NextResponse.json(
              { error: `Formato de hora de início do intervalo inválido: ${breakItem.startTime}. Use HH:MM.` },
              { status: 400 }
            )
          }

          if (!isValidTimeFormat(breakItem.endTime)) {
            return NextResponse.json(
              { error: `Formato de hora de fim do intervalo inválido: ${breakItem.endTime}. Use HH:MM.` },
              { status: 400 }
            )
          }

          if (!isValidTimeRange(breakItem.startTime, breakItem.endTime)) {
            return NextResponse.json(
              { error: `Hora de início do intervalo (${breakItem.startTime}) deve ser menor que hora de fim (${breakItem.endTime}).` },
              { status: 400 }
            )
          }

          // Verificar se o intervalo está dentro do horário de trabalho
          const workStart = timeToMinutes(startTime)
          const workEnd = timeToMinutes(endTime)
          const breakStart = timeToMinutes(breakItem.startTime)
          const breakEnd = timeToMinutes(breakItem.endTime)

          if (breakStart < workStart || breakEnd > workEnd) {
            return NextResponse.json(
              { error: `Intervalo (${breakItem.startTime} - ${breakItem.endTime}) deve estar dentro do horário de trabalho (${startTime} - ${endTime}).` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Verificar duplicatas de dayOfWeek
    const dayOfWeekSet = new Set(scheduleData.map(s => s.dayOfWeek))
    if (dayOfWeekSet.size !== scheduleData.length) {
      return NextResponse.json(
        { error: 'Encontrados dias da semana duplicados.' },
        { status: 400 }
      )
    }

    // Usar transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      // 1. Deletar horários existentes (incluirá intervalos por CASCADE)
      await tx.professionalSchedule.deleteMany({
        where: {
          professionalId
        }
      })

      // 2. Criar novos horários
      if (scheduleData.length > 0) {
        for (const schedule of scheduleData) {
          // Criar o horário base
          const createdSchedule = await tx.professionalSchedule.create({
            data: {
              professionalId,
              dayOfWeek: schedule.dayOfWeek,
              startTime: normalizeTimeFormat(schedule.startTime),
              endTime: normalizeTimeFormat(schedule.endTime)
            }
          })

          // Criar intervalos recorrentes se existirem
          if (schedule.breaks && schedule.breaks.length > 0) {
            await tx.recurringBreak.createMany({
              data: schedule.breaks.map(breakItem => ({
                scheduleId: createdSchedule.id,
                startTime: breakItem.startTime,
                endTime: breakItem.endTime
              }))
            })
          }
        }
      }
    })

    // Buscar os horários criados para retornar
    const newSchedules = await prisma.professionalSchedule.findMany({
      where: {
        professionalId
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    return NextResponse.json({
      message: 'Horários atualizados com sucesso',
      professionalId,
      schedules: newSchedules
    })

  } catch (error) {
    console.error('Erro ao atualizar horários do profissional:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
