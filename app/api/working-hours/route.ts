import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Horários padrão para novos usuários
const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 'monday', startTime: '08:00', endTime: '18:00', isActive: true },
  { dayOfWeek: 'tuesday', startTime: '08:00', endTime: '18:00', isActive: true },
  { dayOfWeek: 'wednesday', startTime: '08:00', endTime: '18:00', isActive: true },
  { dayOfWeek: 'thursday', startTime: '08:00', endTime: '18:00', isActive: true },
  { dayOfWeek: 'friday', startTime: '08:00', endTime: '18:00', isActive: true },
  { dayOfWeek: 'saturday', startTime: '08:00', endTime: '16:00', isActive: true },
  { dayOfWeek: 'sunday', startTime: '09:00', endTime: '15:00', isActive: false }
]

// Função para criar horários padrão para novos usuários
async function createDefaultWorkingHours(tenantId: string) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Criando horários padrão para tenant:', tenantId)
    }
    
    const createdHours = await Promise.all(
      DEFAULT_WORKING_HOURS.map(hours =>
        prisma.workingHours.create({
          data: {
            dayOfWeek: hours.dayOfWeek,
            startTime: hours.startTime,
            endTime: hours.endTime,
            isActive: hours.isActive,
            tenantId: tenantId
          }
        })
      )
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Horários padrão criados:', createdHours.length)
    }
    return createdHours
  } catch (error) {
    console.error('Erro ao criar horários padrão:', error)
    return []
  }
}

// GET - Listar horários do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('GET working hours - TenantID:', user.tenantId)
    }
    
    let workingHours = await prisma.workingHours.findMany({
      where: {
        tenantId: user.tenantId
      },
      orderBy: [
        {
          dayOfWeek: 'asc'
        }
      ]
    })
    
    // Se o usuário não tem horários, criar os padrão
    if (workingHours.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Nenhum horário encontrado, criando horários padrão...')
      }
      const defaultHours = await createDefaultWorkingHours(user.tenantId)
      workingHours = defaultHours
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Horários encontrados:', workingHours.length)
    }
    
    return NextResponse.json({ 
      workingHours,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao buscar horários:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar horários
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { workingHours } = await request.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('PUT working hours - Dados:', { workingHours, tenantId: user.tenantId })
    }
    
    if (!workingHours || !Array.isArray(workingHours)) {
      return NextResponse.json(
        { message: 'Horários são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Atualizar ou criar cada horário
    const updatedHours = await Promise.all(
      workingHours.map(async (hours: any) => {
        return await prisma.workingHours.upsert({
          where: {
            tenantId_dayOfWeek: {
              tenantId: user.tenantId,
              dayOfWeek: hours.dayOfWeek
            }
          },
          update: {
            startTime: hours.startTime,
            endTime: hours.endTime,
            isActive: hours.isActive,
            updatedAt: new Date()
          },
          create: {
            dayOfWeek: hours.dayOfWeek,
            startTime: hours.startTime,
            endTime: hours.endTime,
            isActive: hours.isActive,
            tenantId: user.tenantId
          }
        })
      })
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Horários atualizados:', updatedHours.length)
    }
    
    return NextResponse.json({ 
      workingHours: updatedHours,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao atualizar horários:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
