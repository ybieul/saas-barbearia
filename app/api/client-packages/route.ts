import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

// POST /api/client-packages - vender um pacote para um cliente
// body: { clientId, packageId, expiresAt?, overridePrice? }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode vender pacotes' }, { status: 403 })
    }

    const { clientId, packageId, expiresAt, overridePrice } = await request.json()
    if (!clientId || !packageId) {
      return NextResponse.json({ message: 'clientId e packageId são obrigatórios' }, { status: 400 })
    }

    // Carrega o pacote com os serviços e valida tenant
    const pkg = await prisma.servicePackage.findFirst({
      where: { id: packageId, tenantId: user.tenantId, isActive: true },
      include: { services: true }
    })
    if (!pkg) return NextResponse.json({ message: 'Pacote não encontrado' }, { status: 404 })

    // Confere o cliente pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const priceToCharge = overridePrice != null ? Number(overridePrice) : Number(pkg.totalPrice)
    const expiresDate = expiresAt ? new Date(expiresAt) : (pkg.validDays ? new Date(Date.now() + pkg.validDays * 24 * 60 * 60 * 1000) : null)

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cp = await tx.clientPackage.create({
        data: ({
          clientId,
          packageId,
          expiresAt: expiresDate,
          // Créditos unificados por pacote
          creditsTotal: (pkg as any).defaultCredits ?? 1,
          usedCredits: 0
        } as any)
      })

      // Snapshot dos serviços permitidos para este ClientPackage
      if (Array.isArray(pkg.services) && pkg.services.length > 0) {
        const values = pkg.services.map((s: any) => `('${cp.id}', '${s.serviceId}')`).join(',')
        // @ts-ignore inserir via raw para evitar dependência do client gerado
        await tx.$executeRawUnsafe(`INSERT INTO client_package_allowed_services (clientPackageId, serviceId) VALUES ${values}`)
      }

      await tx.financialRecord.create({
        data: {
          tenantId: user.tenantId,
          type: 'INCOME',
          amount: priceToCharge,
          description: `Venda de pacote: ${pkg.name} para ${client.name}`,
          category: 'Pacotes de Serviços',
          reference: `clientPackage:${cp.id}`
        }
      })

      return cp
    })

    return NextResponse.json({ clientPackage: result, message: 'Pacote vendido com sucesso' })
  } catch (error: any) {
    console.error('Erro ao vender pacote:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// GET /api/client-packages?clientId= - listar pacotes de um cliente (ativos e expirados)
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ message: 'clientId é obrigatório' }, { status: 400 })

    // Confirma que pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const items = await prisma.clientPackage.findMany({
      where: { clientId },
      orderBy: { purchasedAt: 'desc' },
      include: { package: true, credits: { include: { service: { select: { id: true, name: true } } } } }
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Erro ao listar pacotes do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
