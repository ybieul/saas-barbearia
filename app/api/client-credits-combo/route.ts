import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/client-credits-combo?clientId=&serviceIds=a,b,c
// Retorna se existe pacote com combo exato, saldo > 0 e não expirado
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!['OWNER', 'COLLABORATOR'].includes(user.role)) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const rawServiceIds = searchParams.get('serviceIds') // csv

    if (!clientId || !rawServiceIds) {
      return NextResponse.json({ message: 'clientId e serviceIds são obrigatórios' }, { status: 400 })
    }

    const serviceIds = rawServiceIds.split(',').filter(Boolean)
    if (serviceIds.length === 0) {
      return NextResponse.json({ message: 'serviceIds inválido' }, { status: 400 })
    }

    // Garante que o cliente pertence ao tenant do usuário
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const now = new Date()
    const packagesBase = await prisma.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
      SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
      FROM client_packages
      WHERE clientId = ${clientId}
        AND (expiresAt IS NULL OR expiresAt > ${now})
    `
    let allowedRows: Array<{ clientPackageId: string, serviceId: string }> = []
    if (packagesBase.length > 0) {
      const ids = packagesBase.map(p => p.id)
      const placeholders = ids.map(() => '?').join(',')
      // @ts-ignore
      allowedRows = await prisma.$queryRawUnsafe(
        `SELECT clientPackageId, serviceId FROM client_package_allowed_services WHERE clientPackageId IN (${placeholders})`,
        ...ids
      )
    }
    const allowedMap = new Map<string, string[]>()
    for (const row of allowedRows) {
      const arr = allowedMap.get(row.clientPackageId) || []
      arr.push(row.serviceId)
      allowedMap.set(row.clientPackageId, arr)
    }
    const packages = packagesBase
    const withRemaining = packages.filter(p => ((p.creditsTotal || 0) - (p.usedCredits || 0)) > 0)

    // Combo exato: allowedServices == selected
    const selectedSet = new Set(serviceIds)

    const eligible = withRemaining.filter(p => {
  const allowed = allowedMap.get(p.id) || []
      if (allowed.length !== serviceIds.length) return false
      const allowedSet = new Set(allowed)
      for (const id of selectedSet) {
        if (!allowedSet.has(id)) return false
      }
      return true
    })

    if (eligible.length === 0) {
      return NextResponse.json({ covered: false, availableCredits: 0 })
    }

    // Ordenar pelo que expira primeiro (null por último), depois por purchasedAt asc
    eligible.sort((a, b) => {
      const ax = a.expiresAt ? a.expiresAt.getTime() : Number.POSITIVE_INFINITY
      const bx = b.expiresAt ? b.expiresAt.getTime() : Number.POSITIVE_INFINITY
      if (ax !== bx) return ax - bx
      return a.purchasedAt.getTime() - b.purchasedAt.getTime()
    })

  const best = eligible[0] as any
  const creditsRemaining = (best.creditsTotal || 0) - (best.usedCredits || 0)

    return NextResponse.json({
      covered: true,
      package: {
        id: best.id,
        creditsRemaining,
        expiresAt: best.expiresAt,
      }
    })
  } catch (error: any) {
    console.error('Erro em /api/client-credits-combo:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
