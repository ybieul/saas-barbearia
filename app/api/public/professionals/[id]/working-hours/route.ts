import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Função utilitária para parse robusto de JSON com múltiplos escapes
function parseJsonSafely(jsonString: any): any {
  if (typeof jsonString !== 'string') {
    return jsonString
  }
  
  let result = jsonString
  let parseAttempts = 0
  const maxAttempts = 5 // Limite para evitar loop infinito
  
  while (parseAttempts < maxAttempts) {
    try {
      const parsed = JSON.parse(result)
      // Se conseguiu fazer parse e não é mais string, retorna
      if (typeof parsed !== 'string') {
        console.log(`✅ Parse bem-sucedido após ${parseAttempts + 1} tentativa(s)`)
        return parsed
      }
      // Se ainda é string, continua tentando fazer parse
      result = parsed
      parseAttempts++
    } catch (error) {
      console.error(`❌ Erro no parse após ${parseAttempts + 1} tentativa(s):`, error)
      return null
    }
  }
  
  console.warn(`⚠️ Máximo de tentativas de parse atingido (${maxAttempts})`)
  return null
}

// GET - Buscar horários de trabalho de um profissional específico (versão pública)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const professionalId = params.id

    console.log('🔍 [DEBUG PUBLIC API] ========== INÍCIO PUBLIC API ==========')
    console.log('🔍 [DEBUG PUBLIC API] ID do profissional:', professionalId)

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

    console.log('🔍 [DEBUG PUBLIC API] Profissional encontrado:', professional?.name)
    console.log('🔍 [DEBUG PUBLIC API] workingDays RAW do banco:', professional?.workingDays)
    console.log('🔍 [DEBUG PUBLIC API] workingHours RAW do banco:', professional?.workingHours)
    console.log('🔍 [DEBUG PUBLIC API] Tipos:', {
      workingDays: typeof professional?.workingDays,
      workingHours: typeof professional?.workingHours
    })

    if (!professional) {
      console.log('❌ [DEBUG PUBLIC API] Profissional não encontrado')
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
        const workingDaysObj = parseJsonSafely(professional.workingDays)
        
        console.log('� [DEBUG PUBLIC API] workingDays após parse robusto:', workingDaysObj)
        
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
        console.error('❌ [DEBUG PUBLIC API] Erro ao processar workingDays:', error)
        console.error('❌ [DEBUG PUBLIC API] workingDays raw que causou erro:', professional.workingDays)
      }
    }

    // Parse e converter working hours se existir
    if (professional.workingHours) {
      try {
        const workingHoursObj = parseJsonSafely(professional.workingHours)
        
        console.log('🔍 [DEBUG PUBLIC API] workingHours após parse robusto:', workingHoursObj)
        console.log('� [DEBUG PUBLIC API] workingHours keys:', Object.keys(workingHoursObj || {}))
        
        // Verificar se já está no formato numérico ou se precisa converter
        if (workingHoursObj && typeof workingHoursObj === 'object') {
          const firstKey = Object.keys(workingHoursObj)[0]
          const isNumericFormat = !isNaN(Number(firstKey))
          
          console.log('🔍 [DEBUG PUBLIC API] First key:', firstKey, 'isNumericFormat:', isNumericFormat)
          
          if (isNumericFormat) {
            // Já está no formato correto para a página pública
            processedData.professional.workingHours = workingHoursObj
            console.log('✅ [DEBUG PUBLIC API] workingHours já no formato numérico:', workingHoursObj)
          } else {
            // Converter de formato { monday: { start: "10:00", end: "16:00", breaks: [...] } } 
            // para { "1": { periods: [{ start: "10:00", end: "16:00" }], breaks: [...] } }
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
            console.log('✅ [DEBUG PUBLIC API] workingHours convertidos de nomes para números:', convertedHours)
          }
        }
      } catch (error) {
        console.error('❌ [DEBUG PUBLIC API] Erro ao processar workingHours:', error)
        console.error('❌ [DEBUG PUBLIC API] workingHours raw que causou erro:', professional.workingHours)
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
