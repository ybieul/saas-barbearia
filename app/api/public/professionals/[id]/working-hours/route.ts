import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar horários de trabalho de um profissional específico (versão pública)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const professionalId = params.id

    if (!professionalId) {
      return NextResponse.json(
        { message: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar o profissional (sem verificação de tenant para API pública)
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId
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

    // Processar dados para formato esperado pela página pública
    let processedData = {
      professional: {
        id: professional.id,
        name: professional.name,
        workingDays: null,
        workingHours: null
      }
    }

    // Parse working days se existir
    if (professional.workingDays) {
      try {
        processedData.professional.workingDays = JSON.parse(String(professional.workingDays))
      } catch (error) {
        console.warn('Erro ao fazer parse dos workingDays:', error)
      }
    }

    // Parse working hours se existir
    if (professional.workingHours) {
      try {
        processedData.professional.workingHours = JSON.parse(String(professional.workingHours))
      } catch (error) {
        console.warn('Erro ao fazer parse dos workingHours:', error)
      }
    }

    return NextResponse.json(processedData)

  } catch (error) {
    console.error('Erro ao buscar horários do profissional:', error)
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
