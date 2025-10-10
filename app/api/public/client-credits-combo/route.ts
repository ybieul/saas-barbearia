import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/client-credits-combo?businessSlug=&phone=&serviceIds=a,b,c
// Retorna se existe pacote com combo exato, saldo > 0 e não expirado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessSlug = searchParams.get('businessSlug')
    const phone = searchParams.get('phone')
    const rawServiceIds = searchParams.get('serviceIds')

    if (!businessSlug || !phone || !rawServiceIds) {
      return NextResponse.json({ message: 'Parâmetros obrigatórios: businessSlug, phone, serviceIds' }, { status: 400 })
    }

    const serviceIds = rawServiceIds.split(',').filter(Boolean)
    if (serviceIds.length === 0) {
      return NextResponse.json({ message: 'serviceIds inválido' }, { status: 400 })
    }

    // Encontrar tenant por slug
    const tenant = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: { path: '$.customLink', equals: businessSlug }
      },
      select: { id: true }
    })
    if (!tenant) {
      return NextResponse.json({ message: 'Estabelecimento não encontrado' }, { status: 404 })
    }

    // Encontrar cliente por telefone
    const client = await prisma.endUser.findFirst({
      where: { tenantId: tenant.id, phone, isActive: true },
      select: { id: true }
    })
    if (!client) {
      return NextResponse.json({ covered: false, availableCredits: 0 })
    }

    const now = new Date()
    const packagesBase = await prisma.$queryRaw<Array<{ id: string, purchasedAt: Date, expiresAt: Date | null, creditsTotal: number, usedCredits: number }>>`
      SELECT id, purchasedAt, expiresAt, creditsTotal, usedCredits
      FROM client_packages
      WHERE clientId = ${client.id}
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
  } catch (error) {
    console.error('Erro em /api/public/client-credits-combo:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
