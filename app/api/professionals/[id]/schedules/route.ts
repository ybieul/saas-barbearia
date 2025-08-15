import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { isValidTimeFormat, normalizeTimeFormat, isValidTimeRange } from '@/lib/schedule-utils'
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

    // Buscar horários padrão
    const schedules = await prisma.professionalSchedule.findMany({
      where: {
        professionalId
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
        isWorking: !!schedule
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
      const { dayOfWeek, startTime, endTime } = schedule

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
      // 1. Deletar horários existentes
      await tx.professionalSchedule.deleteMany({
        where: {
          professionalId
        }
      })

      // 2. Criar novos horários
      if (scheduleData.length > 0) {
        await tx.professionalSchedule.createMany({
          data: scheduleData.map(schedule => ({
            professionalId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: normalizeTimeFormat(schedule.startTime),
            endTime: normalizeTimeFormat(schedule.endTime)
          }))
        })
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
