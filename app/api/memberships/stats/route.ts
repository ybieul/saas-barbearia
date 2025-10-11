import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { formatError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
  const user = verifyToken(request)
  const tenantId = user.tenantId
  if (!tenantId) return NextResponse.json(formatError('Tenant não encontrado', 404), { status: 404 })

    // MRR: soma dos preços de planos ativos com alguma assinatura ativa
    const now = new Date()
    const activeClientSubs = await prisma.clientSubscription.findMany({
      where: { status: 'ACTIVE', startDate: { lte: now }, endDate: { gte: now }, plan: { isActive: true, tenantId } },
      select: { plan: { select: { price: true } }, clientId: true }
    })
  const mrr = activeClientSubs.reduce<number>((sum: number, s: { plan: { price: unknown }, clientId: string }) => sum + Number(s.plan.price as number), 0)
  const activeSubscriptions = new Set(activeClientSubs.map((s: { clientId: string }) => s.clientId)).size

    // Pacotes ativos: clientes distintos com pacotes válidos e saldo > 0
    const rows = await prisma.$queryRaw<Array<{ clientId: string }>>`
      SELECT DISTINCT clientId
      FROM client_packages
      WHERE
        (expiresAt IS NULL OR expiresAt > ${now})
        AND (creditsTotal - usedCredits) > 0
        AND clientId IN (SELECT id FROM end_users WHERE tenantId = ${tenantId})
    `
    const activePackages = rows.length

    return NextResponse.json({ mrr, activeSubscriptions, activePackages })
  } catch (error: any) {
    return NextResponse.json(formatError(error.message || 'Erro ao calcular estatísticas'), { status: error.status || 500 })
  }
}
