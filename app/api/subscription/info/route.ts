import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSubscriptionInfo } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    
    if (!authUser.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const subscriptionInfo = await getSubscriptionInfo(authUser.tenantId)
    
    return NextResponse.json(subscriptionInfo)
  } catch (error) {
    console.error('Erro ao buscar informações de assinatura:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
