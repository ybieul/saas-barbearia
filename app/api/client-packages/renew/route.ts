import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
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

// POST /api/client-packages/renew
// body: { clientPackageId, paymentMethod?: import('@prisma/client').PaymentMethod, paymentDate?: string, overridePrice?: number, allowImmediateUse?: boolean }
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role !== 'OWNER') {
      return NextResponse.json({ message: 'Apenas o dono pode renovar pacotes' }, { status: 403 })
    }

    const { clientPackageId, paymentMethod, paymentDate, overridePrice, allowImmediateUse } = await request.json()
    if (!clientPackageId) {
      return NextResponse.json({ message: 'clientPackageId é obrigatório' }, { status: 400 })
    }

    const cp = await prisma.clientPackage.findFirst({
      where: { id: clientPackageId },
      include: { client: true, package: true }
    })
    if (!cp) return NextResponse.json({ message: 'Pacote do cliente não encontrado' }, { status: 404 })

    // Segurança multi-tenant: garantir que pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id: cp.clientId, tenantId: user.tenantId } })
    if (!client) return NextResponse.json({ message: 'Pacote não pertence ao seu estabelecimento' }, { status: 403 })

    const pkg = cp.package!

    let preferredRenewalDay = clampPreferredDay(cp.preferredRenewalDay)

    const now = getBrazilNow()
    // Início: se allowImmediateUse true, agora; senão, se ainda vigente, começa após o término; caso contrário, agora
    let start = now
    if (!allowImmediateUse && cp.expiresAt && now <= cp.expiresAt) {
      start = new Date(cp.expiresAt.getTime() + 1000)
    }

    // Fim: baseado em validDays e/ou dia preferido
    let expiresDate: Date | null
    if (preferredRenewalDay) {
      const base = pkg.validDays ? new Date(start.getTime() + pkg.validDays * 24 * 60 * 60 * 1000) : start
      const nextPref = nextOccurrenceOfDay(base, preferredRenewalDay)
      const dayBefore = new Date(nextPref)
      dayBefore.setDate(dayBefore.getDate() - 1)
      expiresDate = getBrazilEndOfDay(dayBefore)
    } else if (pkg.validDays) {
      expiresDate = new Date(start.getTime() + pkg.validDays * 24 * 60 * 60 * 1000)
    } else {
      expiresDate = null
    }

    const priceToCharge = overridePrice != null ? Number(overridePrice) : Number(pkg.totalPrice)
    const creditsTotal = Number.isFinite(Number((pkg as any).defaultCredits)) ? Math.max(parseInt(String((pkg as any).defaultCredits), 10) || 1, 1) : 1

    const result = await prisma.$transaction(async (tx) => {
      const newCp = await tx.clientPackage.create({
        data: {
          clientId: cp.clientId,
          packageId: cp.packageId,
          purchasedAt: start,
          expiresAt: expiresDate,
          preferredRenewalDay,
          creditsTotal,
          usedCredits: 0
        }
      })

      await tx.financialRecord.create({
        data: {
          tenantId: user.tenantId,
          type: 'INCOME',
          amount: priceToCharge,
          description: `Renovação de pacote: ${pkg.name} para ${client.name}`,
          category: 'Pacotes de Serviços',
          reference: `clientPackage:${newCp.id}:renewal`,
          recordSource: 'PACKAGE_RENEWAL_INCOME',
          paymentMethod: paymentMethod || null,
          date: paymentDate ? new Date(paymentDate) : undefined,
          endUserId: client.id
        }
      })

      // Replica snapshot dos serviços permitidos
      const services = await prisma.servicePackageService.findMany({ where: { servicePackageId: cp.packageId } })
      if (services.length) {
        const values = services.map((s: any) => `('${randomUUID().replace(/-/g, '')}', '${newCp.id}', '${s.serviceId}')`).join(',')
        await tx.$executeRawUnsafe(`INSERT INTO client_package_allowed_services (id, clientPackageId, serviceId) VALUES ${values}`)
      }

      return newCp
    })

    return NextResponse.json({ clientPackage: result, message: 'Pacote renovado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao renovar pacote:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
