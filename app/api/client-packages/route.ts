import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth'
import { getBrazilEndOfDay, getBrazilNow } from '@/lib/timezone'

function clampPreferredDay(day?: any): number | undefined {
  const n = Number(day)
  if (!Number.isFinite(n)) return undefined
  if (n < 1 || n > 31) return undefined
  return Math.floor(n)
}

function nextOccurrenceOfDay(base: Date, day: number): Date {
  const d = new Date(base)
  const year = d.getFullYear()
  const month = d.getMonth()
  if (d.getDate() < day) {
    return new Date(year, month, day, 0, 0, 0, 0)
  }
  return new Date(year, month + 1, day, 0, 0, 0, 0)
}

// POST /api/client-packages - vender um pacote para um cliente
// body: { clientId, packageId, expiresAt?, overridePrice?, preferredRenewalDay?: number, allowImmediateUse?: boolean }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode vender pacotes' }, { status: 403 })
    }

    const { clientId, packageId, expiresAt, overridePrice, preferredRenewalDay: prefDayRaw, allowImmediateUse } = await request.json()
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
    let preferredRenewalDay = clampPreferredDay(prefDayRaw)

    // Fallback: se não enviado, recuperar do último pacote deste cliente para o mesmo packageId
    if (preferredRenewalDay == null) {
      try {
        const last = await prisma.clientPackage.findFirst({
          where: { clientId, packageId },
          orderBy: { purchasedAt: 'desc' },
          select: { preferredRenewalDay: true }
        })
        if (last?.preferredRenewalDay != null) preferredRenewalDay = last.preferredRenewalDay
      } catch {
        // fallback via SQL cru não é necessário aqui, findFirst deve funcionar
      }
    }

    const now = getBrazilNow()
    // Determine start (purchasedAt) and expiresAt
    let start: Date
    if (allowImmediateUse === false && preferredRenewalDay) {
      start = nextOccurrenceOfDay(now, preferredRenewalDay)
    } else {
      start = now
    }

    let expiresDate: Date | null
    if (expiresAt) {
      expiresDate = new Date(expiresAt)
    } else if (preferredRenewalDay) {
      const nextPref = nextOccurrenceOfDay(start, preferredRenewalDay)
      const dayBefore = new Date(nextPref)
      dayBefore.setDate(dayBefore.getDate() - 1)
      expiresDate = getBrazilEndOfDay(dayBefore)
    } else if (pkg.validDays) {
      expiresDate = new Date(start.getTime() + pkg.validDays * 24 * 60 * 60 * 1000)
    } else {
      expiresDate = null
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cp = await tx.clientPackage.create({
        data: ({
          clientId,
          packageId,
          purchasedAt: start,
          expiresAt: expiresDate,
          preferredRenewalDay: preferredRenewalDay,
          // Créditos unificados por pacote
          creditsTotal: Number.isFinite(Number((pkg as any).defaultCredits)) ? Math.max(parseInt(String((pkg as any).defaultCredits), 10) || 1, 1) : 1,
          usedCredits: 0
        } as any)
      })

      // Snapshot dos serviços permitidos para este ClientPackage
      if (Array.isArray(pkg.services) && pkg.services.length > 0) {
        const values = pkg.services.map((s: any) => {
          const id = randomUUID().replace(/-/g, '')
          return `('${id}', '${cp.id}', '${s.serviceId}')`
        }).join(',')
        // Inserir com id explícito para não violar PK sem default
        await tx.$executeRawUnsafe(`INSERT INTO client_package_allowed_services (id, clientPackageId, serviceId) VALUES ${values}`)
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

// GET /api/client-packages?clientId=&page=&pageSize= - listar pacotes de um cliente (ativos e expirados) com paginação
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ message: 'clientId é obrigatório' }, { status: 400 })

    // Confirma que pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const pageSize = Math.max(Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 100), 1)

    const [total, items] = await Promise.all([
      prisma.clientPackage.count({ where: { clientId } }),
      prisma.clientPackage.findMany({
        where: { clientId },
        orderBy: { purchasedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { package: true, credits: { include: { service: { select: { id: true, name: true } } } } }
      })
    ])

    const hasNext = page * pageSize < total
    return NextResponse.json({ items, meta: { total, page, pageSize, hasNext } })
  } catch (error: any) {
    console.error('Erro ao listar pacotes do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// PUT /api/client-packages - desativar/estornar um pacote do cliente
// body: { id, action: 'deactivate', refundAmount? }
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode alterar pacotes' }, { status: 403 })
    }

    const { id, action, refundAmount } = await request.json()
    if (!id || !action) {
      return NextResponse.json({ message: 'id e action são obrigatórios' }, { status: 400 })
    }

    const cp = await prisma.clientPackage.findFirst({
      where: { id },
      include: { client: true, package: true }
    })
    if (!cp) return NextResponse.json({ message: 'Pacote do cliente não encontrado' }, { status: 404 })

    // Segurança multi-tenant: garantir que pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: cp.clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Pacote não pertence ao seu estabelecimento' }, { status: 403 })

    if (action !== 'deactivate') {
      return NextResponse.json({ message: 'Ação não suportada' }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.clientPackage.update({
        where: { id: cp.id },
        data: { expiresAt: now }
      })

      const refundValue = refundAmount != null ? Number(refundAmount) : 0
      if (Number.isFinite(refundValue) && refundValue > 0) {
        await tx.financialRecord.create({
          data: {
            tenantId: user.tenantId,
            type: 'EXPENSE',
            amount: refundValue,
            description: `Estorno de pacote: ${cp.package?.name || 'Pacote'} para ${client.name}`,
            category: 'Estornos de Pacotes',
            reference: `clientPackage:${cp.id}:refund`
          }
        })
      }

      return upd
    })

    return NextResponse.json({ clientPackage: updated, message: 'Pacote desativado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao alterar pacote do cliente:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
