import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequired } from '@/lib/api-utils'
import { verifyToken, AuthError } from '@/lib/auth'

// tenantId vem do token

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    const plans = await (prisma as any).subscriptionPlan.findMany({
      where: { tenantId },
      include: { services: { select: { id: true, name: true } }, _count: { select: { clientSubscriptions: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ plans })
  } catch (error: any) {
    // Prisma: tabela não existe (migração não aplicada)
    const msg = error?.message || ''
    if (error?.code === 'P2021' || error?.code === 'P2022' || /doesn't exist|does not exist|Unknown table/i.test(msg)) {
      return NextResponse.json({ message: 'Assinaturas não configuradas no banco. Aplique a migração de assinaturas e tente novamente.' }, { status: 503 })
    }
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: error.message || 'Erro ao listar planos' }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const body = await request.json()
    const missing = validateRequired(body, ['name', 'price', 'cycleInDays'])
    if (missing) return NextResponse.json({ message: missing }, { status: 400 })

    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    const serviceIds: string[] = Array.isArray(body.services) ? body.services.filter(Boolean) : []
    // Garantir que os serviços pertençam ao tenant
    let connectServices: { id: string }[] | undefined
    if (serviceIds.length > 0) {
      const valid = await prisma.service.findMany({ where: { id: { in: serviceIds }, tenantId }, select: { id: true } })
      if (valid.length === 0) return NextResponse.json({ message: 'Nenhum serviço válido encontrado para este tenant' }, { status: 400 })
      connectServices = valid.map(s => ({ id: s.id }))
    }

    const plan = await (prisma as any).subscriptionPlan.create({
      data: {
        name: body.name,
        price: body.price,
        cycleInDays: body.cycleInDays,
        isActive: body.isActive ?? true,
        tenantId,
        ...(connectServices ? { services: { connect: connectServices } } : {}),
      },
    })

    return NextResponse.json({ plan })
  } catch (error: any) {
    const msg = error?.message || ''
    if (error?.code === 'P2021' || error?.code === 'P2022' || /doesn't exist|does not exist|Unknown table/i.test(msg)) {
      return NextResponse.json({ message: 'Assinaturas não configuradas no banco. Aplique a migração de assinaturas e tente novamente.' }, { status: 503 })
    }
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: msg || 'Erro ao criar plano' }, { status })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const body = await request.json()
    const missing = validateRequired(body, ['id'])
    if (missing) return NextResponse.json({ message: missing }, { status: 400 })

    const { id, name, price, cycleInDays, isActive, services } = body

    let servicesSet: { id: string }[] | undefined
    if (Array.isArray(services)) {
      const valid = await prisma.service.findMany({ where: { id: { in: services }, tenantId: user.tenantId }, select: { id: true } })
      servicesSet = valid.map(s => ({ id: s.id }))
    }

    const plan = await (prisma as any).subscriptionPlan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(cycleInDays !== undefined && { cycleInDays }),
        ...(isActive !== undefined && { isActive }),
        ...(servicesSet ? { services: { set: servicesSet } } : {}),
      },
      include: { services: true },
    })

    return NextResponse.json({ plan })
  } catch (error: any) {
    const msg = error?.message || ''
    if (error?.code === 'P2021' || error?.code === 'P2022' || /doesn't exist|does not exist|Unknown table/i.test(msg)) {
      return NextResponse.json({ message: 'Assinaturas não configuradas no banco. Aplique a migração de assinaturas e tente novamente.' }, { status: 503 })
    }
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: msg || 'Erro ao atualizar plano' }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'id é obrigatório' }, { status: 400 })

    await (prisma as any).subscriptionPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: error?.message || 'Erro ao remover plano' }, { status })
  }
}
