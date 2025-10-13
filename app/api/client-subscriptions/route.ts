import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// POST /api/client-subscriptions - vender uma assinatura para um cliente
// body: { clientId, planId, startDate?, endDate?, overridePrice? }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode vender assinaturas' }, { status: 403 })
    }

    const { clientId, planId, startDate, endDate, overridePrice } = await request.json()
    if (!clientId || !planId) {
      return NextResponse.json({ message: 'clientId e planId são obrigatórios' }, { status: 400 })
    }

    // Valida tenant e dados
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, tenantId: user.tenantId, isActive: true } })
    if (!plan) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + plan.cycleInDays * 24 * 60 * 60 * 1000)

    const priceToCharge = overridePrice != null ? Number(overridePrice) : Number(plan.price)

    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.clientSubscription.create({
        data: { clientId, planId, startDate: start, endDate: end, status: 'ACTIVE' }
      })

      await tx.financialRecord.create({
        data: {
          tenantId: user.tenantId,
          type: 'INCOME',
          amount: priceToCharge,
          description: `Venda de assinatura: ${plan.name} para ${client.name}`,
          category: 'Assinaturas',
          reference: `clientSubscription:${sub.id}`
        }
      })

      return sub
    })

    return NextResponse.json({ clientSubscription: result, message: 'Assinatura vendida com sucesso' })
  } catch (error: any) {
    console.error('Erro ao vender assinatura:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// GET /api/client-subscriptions?clientId=
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ message: 'clientId é obrigatório' }, { status: 400 })

    const items = await prisma.clientSubscription.findMany({
      where: { clientId, plan: { tenantId: user.tenantId } },
      orderBy: { startDate: 'desc' },
      include: { plan: true }
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Erro ao listar assinaturas do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
