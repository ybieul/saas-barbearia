import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Resumo do estoque (valor total em custo, abaixo do mínimo, lucro potencial)
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const products: Array<any> = await (prisma as any).product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { costPrice: true, salePrice: true, stockQuantity: true, minStockAlert: true }
    })

    let totalCostValue = 0
    let belowMinCount = 0
    let potentialProfit = 0

    for (const p of products) {
      const stock = Number(p.stockQuantity || 0)
      const cost = Number(p.costPrice || 0)
      const sale = Number(p.salePrice || 0)
      totalCostValue += cost * stock
      potentialProfit += (sale - cost) * stock
      if (p.minStockAlert != null && stock <= p.minStockAlert) belowMinCount += 1
    }

    return NextResponse.json({
      totalCostValue,
      belowMinCount,
      potentialProfit
    })
  } catch (error) {
    console.error('GET /api/products/summary error', error)
    return NextResponse.json({ message: 'Erro ao calcular resumo do estoque' }, { status: 500 })
  }
}
