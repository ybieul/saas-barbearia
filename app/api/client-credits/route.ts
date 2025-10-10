import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/client-credits?clientId=&serviceId=
// Retorna { availableCredits: number, expiresAt: Date | null }
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    // OWNER e COLLAB do mesmo tenant podem consultar
    if (!['OWNER', 'COLLABORATOR'].includes(user.role)) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const serviceId = searchParams.get('serviceId')
    if (!clientId || !serviceId) {
      return NextResponse.json({ message: 'clientId e serviceId são obrigatórios' }, { status: 400 })
    }

    // Garante que o cliente pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    // Busca todos pacotes do cliente para esse serviço
    const packages = await prisma.clientPackage.findMany({
      where: { clientId },
      include: { credits: { where: { serviceId }, select: { totalCredits: true, usedCredits: true } } }
    })

    const availableCredits = packages.reduce((acc, cp) => {
      const sum = cp.credits.reduce((s, c) => s + (c.totalCredits - c.usedCredits), 0)
      return acc + sum
    }, 0)

    // Menor expiresAt válido (se existir)
    const futureExpirations = packages
      .map(p => p.expiresAt)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())
    const nearestExpiration = futureExpirations.length > 0 ? futureExpirations[0] : null

    return NextResponse.json({ availableCredits, expiresAt: nearestExpiration })
  } catch (error: any) {
    console.error('Erro ao consultar créditos do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
