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
        workingDays: null as number[] | null,
        workingHours: null as any | null
      }
    }

    // Parse e converter working days se existir
    if (professional.workingDays) {
      try {
        const workingDaysObj = JSON.parse(String(professional.workingDays))
        console.log('🔍 [DEBUG PUBLIC API] workingDays originais:', workingDaysObj)
        
        // Converter de formato { monday: true, tuesday: false, ... } para [1, 2, 3, 4, 5]
        if (typeof workingDaysObj === 'object' && workingDaysObj !== null) {
          const dayMapping = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
            thursday: 4, friday: 5, saturday: 6
          }
          
          const workingDaysArray = []
          for (const [day, isWorking] of Object.entries(workingDaysObj)) {
            if (isWorking && dayMapping[day as keyof typeof dayMapping] !== undefined) {
              workingDaysArray.push(dayMapping[day as keyof typeof dayMapping])
            }
          }
          
          processedData.professional.workingDays = workingDaysArray
          console.log('✅ [DEBUG PUBLIC API] workingDays convertidos:', workingDaysArray)
        }
      } catch (error) {
        console.warn('Erro ao fazer parse dos workingDays:', error)
      }
    }

    // Parse e converter working hours se existir
    if (professional.workingHours) {
      try {
        const workingHoursObj = JSON.parse(String(professional.workingHours))
        console.log('🔍 [DEBUG PUBLIC API] workingHours originais:', workingHoursObj)
        
        // Converter de formato { monday: { start: "10:00", end: "16:00", breaks: [...] } } 
        // para { "1": { periods: [{ start: "10:00", end: "16:00" }], breaks: [...] } }
        if (typeof workingHoursObj === 'object' && workingHoursObj !== null) {
          const dayMapping = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
            thursday: 4, friday: 5, saturday: 6
          }
          
          const convertedHours: any = {}
          for (const [day, schedule] of Object.entries(workingHoursObj)) {
            const dayNumber = dayMapping[day as keyof typeof dayMapping]
            if (dayNumber !== undefined && schedule && typeof schedule === 'object') {
              const daySchedule = schedule as { start: string, end: string, breaks?: any[] }
              convertedHours[dayNumber.toString()] = {
                periods: [{ 
                  start: daySchedule.start, 
                  end: daySchedule.end 
                }],
                breaks: daySchedule.breaks || []
              }
            }
          }
          
          processedData.professional.workingHours = convertedHours
          console.log('✅ [DEBUG PUBLIC API] workingHours convertidos:', convertedHours)
        }
      } catch (error) {
        console.warn('Erro ao fazer parse dos workingHours:', error)
      }
    }

    console.log('🎯 [DEBUG PUBLIC API] Dados finais enviados:', processedData)

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
