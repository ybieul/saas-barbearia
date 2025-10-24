import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { FinancialRecord, Professional } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

interface SaleItem {
  productId: string
  quantity: number
  professionalId?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { items, clientId }: { items: SaleItem[]; clientId?: string } = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Itens da venda são obrigatórios' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdRecords: FinancialRecord[] = []

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error('Item inválido: productId e quantity > 0 são obrigatórios')
        }

  // @ts-expect-error Prisma Client local types podem estar desatualizados; model Product existe após a migração
  const product = await tx.product.findFirst({ where: { id: item.productId, tenantId: user.tenantId } })
        if (!product) throw new Error('Produto não encontrado')

        // Validar estoque
        if ((product.stockQuantity ?? 0) < item.quantity) {
          throw new Error(`Estoque insuficiente para ${product.name}`)
        }

        // Buscar profissional (opcional)
  let professional: Professional | null = null
        if (item.professionalId) {
          professional = await tx.professional.findFirst({ where: { id: item.professionalId, tenantId: user.tenantId } })
          if (!professional) throw new Error('Profissional informado não encontrado')
        }

        const qty = Number(item.quantity)
        const saleAmount = Number(product.salePrice) * qty
        const unitCost = Number(product.costPrice)
  const commissionPct = Number((professional as unknown as { productCommissionPercentage?: number })?.productCommissionPercentage || 0)
        const commission = saleAmount * commissionPct

        // Atualizar estoque
        // @ts-expect-error Prisma Client local types podem estar desatualizados; model Product existe após a migração
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: Math.max(0, Number(product.stockQuantity || 0) - qty) }
        })

        // Criar registro financeiro
        const record = await tx.financialRecord.create({
          data: {
            type: 'INCOME',
            // @ts-expect-error Campo recordSource existe após a migração
            recordSource: 'PRODUCT_SALE_INCOME',
            amount: saleAmount,
            description: `Venda de ${qty}x ${product.name}`,
            category: 'VENDAS',
            productId: product.id,
            quantity: qty,
            costPrice: unitCost, // unit cost; lucro = amount - (costPrice * quantity)
            commissionEarned: commission,
            professionalId: professional?.id || null,
            endUserId: clientId || null,
            tenantId: user.tenantId
          }
        })

        createdRecords.push(record)
      }

      return { records: createdRecords }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Erro em POST /api/product-sales:', error)
    return NextResponse.json({ message: error?.message || 'Erro ao registrar venda de produtos' }, { status: 400 })
  }
}
