import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/client-packages/summary?clientIds=a,b,c
// Retorna mapa por clientId com hasAny e hasActive
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('clientIds')
    if (!raw) return NextResponse.json({ message: 'clientIds é obrigatório' }, { status: 400 })
    const clientIds = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (clientIds.length === 0) return NextResponse.json({ summary: {} })

    const now = new Date()

    // Todos os pacotes (qualquer status) desses clientes do tenant
    const anyRows = await prisma.clientPackage.findMany({
      where: {
        clientId: { in: clientIds },
        client: { tenantId: user.tenantId }
      },
      select: { clientId: true }
    })

    // Pacotes com saldo e não expirados
    // Usar queryRaw para calcular saldo no banco pode ser mais performático, mas aqui mantemos simples
    const activeRows = await prisma.clientPackage.findMany({
      where: {
        clientId: { in: clientIds },
        client: { tenantId: user.tenantId },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    }) as Array<{ clientId: string; creditsTotal?: number; usedCredits?: number }>

    const anySet = new Set(anyRows.map(r => r.clientId))
  const activeSet = new Set(activeRows.filter(r => (Number(r.creditsTotal || 0) - Number(r.usedCredits || 0)) > 0).map(r => r.clientId))

    const summary: Record<string, { hasAny: boolean; hasActive: boolean }> = {}
    for (const id of clientIds) {
      summary[id] = { hasAny: anySet.has(id), hasActive: activeSet.has(id) }
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Erro em /api/client-packages/summary:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
