import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Buscar horários de trabalho de um profissional específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id

    // Buscar o profissional
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        tenantId: user.tenantId
      },
      select: {
        id: true,
        name: true,
        workingDays: true,
        workingHours: true
      }
    })

    if (!professional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Retornar horários ou valores padrão
    const parsedWorkingDays = professional.workingDays ? JSON.parse(String(professional.workingDays)) : null
    const parsedWorkingHours = professional.workingHours ? JSON.parse(String(professional.workingHours)) : null
    
    const workingDays = parsedWorkingDays || {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    }

    const workingHours = parsedWorkingHours || {
      monday: { start: "08:00", end: "18:00", breaks: [] },
      tuesday: { start: "08:00", end: "18:00", breaks: [] },
      wednesday: { start: "08:00", end: "18:00", breaks: [] },
      thursday: { start: "08:00", end: "18:00", breaks: [] },
      friday: { start: "08:00", end: "18:00", breaks: [] },
      saturday: { start: "08:00", end: "16:00", breaks: [] },
      sunday: { start: "09:00", end: "15:00", breaks: [] }
    }

    return NextResponse.json({
      success: true,
      professional: {
        id: professional.id,
        name: professional.name,
        workingDays,
        workingHours
      }
    })
  } catch (error) {
    console.error('Erro ao buscar horários do profissional:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar horários de trabalho de um profissional
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = verifyToken(request)
    const professionalId = params.id
    const body = await request.json()
    const { workingDays, workingHours } = body

    console.log('🔍 [DEBUG PUT] ============ INÍCIO PUT ============')
    console.log('🔍 [DEBUG PUT] Profissional ID:', professionalId)
    console.log('🔍 [DEBUG PUT] Body completo recebido:', JSON.stringify(body, null, 2))
    console.log('🔍 [DEBUG PUT] workingDays recebidos:', workingDays)
    console.log('🔍 [DEBUG PUT] workingHours recebidos:', workingHours)
    console.log('🔍 [DEBUG PUT] Tipo workingDays:', typeof workingDays)
    console.log('🔍 [DEBUG PUT] Tipo workingHours:', typeof workingHours)
    console.log('🔍 [DEBUG PUT] User tenant:', user.tenantId)

    console.log('🔍 [DEBUG PUT] Recebendo dados:', { 
      professionalId, 
      workingDays, 
      workingHours, 
      tenantId: user.tenantId 
    })

    // Verificar se o profissional existe e pertence ao tenant
    const existingProfessional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        tenantId: user.tenantId
      }
    })

    if (!existingProfessional) {
      console.log('❌ [DEBUG PUT] Profissional não encontrado:', professionalId)
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ [DEBUG PUT] Profissional encontrado:', existingProfessional.name)

    // Validar dados de entrada
    if (workingDays && typeof workingDays !== 'object') {
      return NextResponse.json(
        { message: 'Dias de trabalho devem ser um objeto' },
        { status: 400 }
      )
    }

    if (workingHours && typeof workingHours !== 'object') {
      return NextResponse.json(
        { message: 'Horários de trabalho devem ser um objeto' },
        { status: 400 }
      )
    }

    // Validar horários (formato HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (workingHours) {
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      for (const day of daysOfWeek) {
        if (workingHours[day]) {
          const { start, end, breaks = [] } = workingHours[day]
          
          // Validar formato de horários
          if (start && !timeRegex.test(start)) {
            return NextResponse.json(
              { message: `Horário de início inválido para ${day}: ${start}` },
              { status: 400 }
            )
          }
          
          if (end && !timeRegex.test(end)) {
            return NextResponse.json(
              { message: `Horário de fim inválido para ${day}: ${end}` },
              { status: 400 }
            )
          }

          // Validar se início é menor que fim
          if (start && end) {
            const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1])
            const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])
            
            if (startMinutes >= endMinutes) {
              return NextResponse.json(
                { message: `Horário de início deve ser anterior ao fim para ${day}` },
                { status: 400 }
              )
            }
          }

          // Validar intervalos
          if (breaks && Array.isArray(breaks)) {
            for (const breakItem of breaks) {
              if (!timeRegex.test(breakItem.start) || !timeRegex.test(breakItem.end)) {
                return NextResponse.json(
                  { message: `Horário de intervalo inválido para ${day}` },
                  { status: 400 }
                )
              }
            }
          }
        }
      }
    }

    // Atualizar no banco de dados
    console.log('🔄 [DEBUG PUT] Atualizando dados no banco...')
    console.log('🔄 [DEBUG PUT] workingDays para salvar:', workingDays)
    console.log('🔄 [DEBUG PUT] workingHours para salvar:', workingHours)
    
    const updatedProfessional = await prisma.professional.update({
      where: { id: professionalId },
      data: {
        ...(workingDays !== undefined && { workingDays: JSON.stringify(workingDays) }),
        ...(workingHours !== undefined && { workingHours: JSON.stringify(workingHours) }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        workingDays: true,
        workingHours: true
      }
    })

    console.log('✅ [DEBUG PUT] Dados salvos com sucesso!')
    console.log('✅ [DEBUG PUT] workingDays salvo:', updatedProfessional.workingDays)
    console.log('✅ [DEBUG PUT] workingHours salvo:', updatedProfessional.workingHours)

    return NextResponse.json({
      success: true,
      professional: {
        ...updatedProfessional,
        workingDays: updatedProfessional.workingDays ? JSON.parse(String(updatedProfessional.workingDays)) : null,
        workingHours: updatedProfessional.workingHours ? JSON.parse(String(updatedProfessional.workingHours)) : null
      }
    })
  } catch (error) {
    console.error('Erro ao atualizar horários do profissional:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
