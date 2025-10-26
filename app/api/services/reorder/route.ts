import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// PUT - Reordenar serviços (arrastar e soltar)
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const body = await request.json()
    const serviceIds: string[] = body?.serviceIds

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json({ message: 'serviceIds deve ser um array não vazio' }, { status: 400 })
    }

    // Validação: garantir que todos pertencem ao tenant
    const existing = await prisma.service.findMany({
      where: { id: { in: serviceIds }, tenantId: user.tenantId },
      select: { id: true }
    })

    if (existing.length !== serviceIds.length) {
      return NextResponse.json({ message: 'Um ou mais serviços não pertencem ao tenant' }, { status: 403 })
    }

    // Atualiza displayOrder com transação
    await prisma.$transaction(
      serviceIds.map((id, index) =>
        prisma.service.update({
          where: { id },
          data: { displayOrder: index }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao reordenar serviços:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
