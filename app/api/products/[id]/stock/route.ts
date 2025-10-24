import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PATCH - Ajustar estoque (definir quantidade atual)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = verifyToken(request)
    if (user.role === 'COLLABORATOR') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { id } = params
    const { newQuantity } = await request.json()

    if (newQuantity == null || isNaN(Number(newQuantity))) {
      return NextResponse.json({ message: 'newQuantity numérico é obrigatório' }, { status: 400 })
    }

  const existing = await (prisma as any).product.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!existing) return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })

    const product = await (prisma as any).product.update({
      where: { id },
      data: { stockQuantity: parseInt(newQuantity) }
    })

    return NextResponse.json({ product, message: 'Estoque ajustado com sucesso' })
  } catch (error) {
    console.error('PATCH /api/products/[id]/stock error', error)
    return NextResponse.json({ message: 'Erro ao ajustar estoque' }, { status: 500 })
  }
}
