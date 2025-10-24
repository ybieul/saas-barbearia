import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Listar produtos
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const where: any = { tenantId: user.tenantId }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    }
  const products = await (prisma as any).product.findMany({ where, orderBy: { name: 'asc' } })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('GET /api/products error', error)
    return NextResponse.json({ message: 'Erro ao listar produtos' }, { status: 500 })
  }
}

// POST - Criar produto
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role === 'COLLABORATOR') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }
    const body = await request.json()
    const { name, description, costPrice, salePrice, stockQuantity, minStockAlert } = body

    if (!name || costPrice == null || salePrice == null) {
      return NextResponse.json({ message: 'Nome, preço de custo e preço de venda são obrigatórios' }, { status: 400 })
    }

    const product = await (prisma as any).product.create({
      data: {
        name,
        description: description || null,
        costPrice: parseFloat(costPrice),
        salePrice: parseFloat(salePrice),
        stockQuantity: stockQuantity != null ? parseInt(stockQuantity) : 0,
        minStockAlert: minStockAlert != null ? parseInt(minStockAlert) : null,
        tenantId: user.tenantId,
      }
    })

    return NextResponse.json({ product, message: 'Produto criado com sucesso' })
  } catch (error) {
    console.error('POST /api/products error', error)
    return NextResponse.json({ message: 'Erro ao criar produto' }, { status: 500 })
  }
}

// PUT - Atualizar produto
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role === 'COLLABORATOR') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }
    const body = await request.json()
    const { id, name, description, costPrice, salePrice, stockQuantity, minStockAlert, isActive } = body

    if (!id) {
      return NextResponse.json({ message: 'ID é obrigatório' }, { status: 400 })
    }

  const existing = await (prisma as any).product.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) {
      return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })
    }

    const product = await (prisma as any).product.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        costPrice: costPrice != null ? parseFloat(costPrice) : existing.costPrice,
        salePrice: salePrice != null ? parseFloat(salePrice) : existing.salePrice,
        stockQuantity: stockQuantity != null ? parseInt(stockQuantity) : existing.stockQuantity,
        minStockAlert: minStockAlert !== undefined ? (minStockAlert != null ? parseInt(minStockAlert) : null) : existing.minStockAlert,
        isActive: isActive != null ? !!isActive : existing.isActive,
      }
    })

    return NextResponse.json({ product, message: 'Produto atualizado com sucesso' })
  } catch (error) {
    console.error('PUT /api/products error', error)
    return NextResponse.json({ message: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

// DELETE - Remover produto
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (user.role === 'COLLABORATOR') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'ID é obrigatório' }, { status: 400 })

  const existing = await (prisma as any).product.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) {
      return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })
    }

    // Opcional: verificar se há registros financeiros vinculados antes de deletar

  await (prisma as any).product.delete({ where: { id } })
    return NextResponse.json({ message: 'Produto removido com sucesso' })
  } catch (error) {
    console.error('DELETE /api/products error', error)
    return NextResponse.json({ message: 'Erro ao remover produto' }, { status: 500 })
  }
}
