import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/client-credits?businessSlug=&phone=&serviceId=
// Retorna { availableCredits: number, expiresAt: Date | null }
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessSlug = searchParams.get('businessSlug')
    const phone = searchParams.get('phone')
    const serviceId = searchParams.get('serviceId')

    if (!businessSlug || !phone || !serviceId) {
      return NextResponse.json({ message: 'Parâmetros obrigatórios: businessSlug, phone, serviceId' }, { status: 400 })
    }

    // Encontrar tenant
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
      return NextResponse.json({ availableCredits: 0, expiresAt: null })
    }

    // Pacotes do cliente e créditos para o serviço
    const packages = await prisma.clientPackage.findMany({
      where: { clientId: client.id },
      include: {
        credits: { where: { serviceId }, select: { totalCredits: true, usedCredits: true } }
      }
    })

    const availableCredits = packages.reduce((acc, cp) => {
      const sum = cp.credits.reduce((s, c) => s + (c.totalCredits - c.usedCredits), 0)
      return acc + sum
    }, 0)

    const futureExpirations = packages
      .map(p => p.expiresAt)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())
    const nearestExpiration = futureExpirations.length > 0 ? futureExpirations[0] : null

    return NextResponse.json({ availableCredits, expiresAt: nearestExpiration })
  } catch (error: any) {
    console.error('Erro em /api/public/client-credits:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
