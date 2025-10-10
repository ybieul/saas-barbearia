import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatError, validateRequired } from '@/lib/api-utils'
import { verifyToken } from '@/lib/auth'

// tenantId vem do token

export async function GET(request: NextRequest) {
  try {
    verifyToken(request)
  const tenantId = (verifyToken as any)(request).tenantId
    if (!tenantId) return NextResponse.json(formatError('Tenant não encontrado', 404), { status: 404 })

    const plans = await (prisma as any).subscriptionPlan.findMany({
      where: { tenantId },
      include: { services: { select: { id: true, name: true } }, _count: { select: { clientSubscriptions: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ plans })
  } catch (error: any) {
    return NextResponse.json(formatError(error.message || 'Erro ao listar planos'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyToken(request)
    const body = await request.json()
    const missing = validateRequired(body, ['name', 'price', 'cycleInDays'])
    if (missing) return NextResponse.json(formatError(missing, 400), { status: 400 })

  const tenantId = (verifyToken as any)(request).tenantId
    if (!tenantId) return NextResponse.json(formatError('Tenant não encontrado', 404), { status: 404 })

    const plan = await (prisma as any).subscriptionPlan.create({
      data: {
        name: body.name,
        price: body.price,
        cycleInDays: body.cycleInDays,
        isActive: body.isActive ?? true,
        tenantId,
        services: body.services && Array.isArray(body.services)
          ? { connect: body.services.map((id: string) => ({ id })) }
          : undefined,
      },
    })

    return NextResponse.json({ plan })
  } catch (error: any) {
    return NextResponse.json(formatError(error.message || 'Erro ao criar plano'), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyToken(request)
    const body = await request.json()
    const missing = validateRequired(body, ['id'])
    if (missing) return NextResponse.json(formatError(missing, 400), { status: 400 })

    const { id, name, price, cycleInDays, isActive, services } = body

    const plan = await (prisma as any).subscriptionPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(cycleInDays !== undefined && { cycleInDays }),
        ...(isActive !== undefined && { isActive }),
        ...(services && Array.isArray(services) ? { services: { set: services.map((sid: string) => ({ id: sid })) } } : {}),
      },
      include: { services: true },
    })

    return NextResponse.json({ plan })
  } catch (error: any) {
    return NextResponse.json(formatError(error.message || 'Erro ao atualizar plano'), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json(formatError('id é obrigatório', 400), { status: 400 })

  await (prisma as any).subscriptionPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(formatError(error.message || 'Erro ao remover plano'), { status: 500 })
  }
}
