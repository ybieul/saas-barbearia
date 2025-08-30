import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    
    if (!authUser.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Buscar limites para todos os recursos
    const [clientsLimit, appointmentsLimit, servicesLimit, professionalsLimit] = await Promise.all([
      checkPlanLimit(authUser.tenantId, 'clients'),
      checkPlanLimit(authUser.tenantId, 'appointments'), 
      checkPlanLimit(authUser.tenantId, 'services'),
      checkPlanLimit(authUser.tenantId, 'professionals')
    ])
    
    const limits = {
      clients: clientsLimit,
      appointments: appointmentsLimit,
      services: servicesLimit,
      professionals: professionalsLimit
    }
    
    return NextResponse.json(limits)
  } catch (error) {
    console.error('Erro ao buscar limites do plano:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
