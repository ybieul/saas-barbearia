import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = verifyToken(request)
    const { id } = params

    // Validar cliente pertence ao tenant
    const client = await prisma.endUser.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } })
    if (!client) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })

    const records: any[] = await prisma.financialRecord.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'INCOME',
        // @ts-ignore - campo adicionado por migração
        recordSource: 'PRODUCT_SALE_INCOME',
        endUserId: id
      } as any,
      orderBy: { date: 'desc' },
      // @ts-ignore - campos adicionados por migração
      select: { id: true, date: true, amount: true, quantity: true, costPrice: true, commissionEarned: true, productId: true } as any
    })

    // Enriquecer com nomes de produto
  const productIds = Array.from(new Set(records.map((r: any) => r.productId).filter(Boolean))) as string[]
    const products = productIds.length > 0 ? await (prisma as any).product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, name: true } }) : []
    const nameMap = new Map<string, string>(products.map((p: any) => [p.id, p.name]))

    const list = records.map((r: any) => ({
      id: r.id,
      date: r.date,
      productId: r.productId,
      productName: r.productId ? (nameMap.get(r.productId) || 'Produto') : 'Produto',
      quantity: r.quantity || 0,
      amount: Number(r.amount || 0),
      unitCost: Number(r.costPrice || 0),
      commissionEarned: Number(r.commissionEarned || 0)
    }))

    return NextResponse.json({ purchases: list })
  } catch (error) {
    console.error('GET /api/clients/[id]/product-purchases error', error)
    return NextResponse.json({ message: 'Erro ao buscar compras de produtos' }, { status: 500 })
  }
}
