import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequired } from '@/lib/api-utils'
import { verifyToken, AuthError } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// tenantId vem do token

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const tenantId = user.tenantId
    if (!tenantId) return NextResponse.json({ message: 'Tenant não encontrado' }, { status: 404 })

    // Tenta incluir serviços normalmente; se falhar (ex.: tabela de junção ausente ou permissão), faz fallback sem include
    try {
  const plans = await prisma.subscriptionPlan.findMany({
        where: { tenantId },
        include: { services: { select: { id: true, name: true } }, _count: { select: { clientSubscriptions: true } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ plans })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
  const plans = await prisma.subscriptionPlan.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
      return NextResponse.json({ plans, warning: 'Planos listados sem serviços vinculados. Motivo: ' + (msg || 'falha ao carregar serviços.') })
    }
  } catch (error: any) {
    const msg = error?.message || ''
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

    try {
      // 1) Cria o plano básico
  let plan = await prisma.subscriptionPlan.create({
        data: {
          name: body.name,
          price: body.price,
          cycleInDays: body.cycleInDays,
          isActive: body.isActive ?? true,
          tenantId,
        },
      })
      // 2) Tenta vincular serviços (passo separado para evitar derrubar a criação)
      if (connectServices && connectServices.length > 0) {
        try {
          plan = await prisma.subscriptionPlan.update({
            where: { id: plan.id },
            data: { services: { connect: connectServices } },
            include: { services: true }
          })
          return NextResponse.json({ plan })
        } catch (linkErr: any) {
          const warn = 'Plano criado, mas os serviços não foram vinculados. Verifique se a migração da tabela de junção está aplicada e tente editar o plano para adicionar os serviços.'
          return NextResponse.json({ plan, warning: warn }, { status: 201 })
        }
      }
      return NextResponse.json({ plan })
    } catch (err: any) {
      const msg = err?.message || ''
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2021' || (err as Prisma.PrismaClientKnownRequestError)?.code === 'P2022' || /doesn't exist|does not exist|Unknown table/i.test(msg)) {
        // Fallback: cria o plano sem relacionar serviços e retorna aviso
  const plan = await prisma.subscriptionPlan.create({
          data: {
            name: body.name,
            price: body.price,
            cycleInDays: body.cycleInDays,
            isActive: body.isActive ?? true,
            tenantId,
          },
        })
        return NextResponse.json({ plan, warning: 'Plano criado sem vincular serviços pois a tabela de junção não está disponível. Aplique a migração e edite o plano para adicionar serviços.' }, { status: 201 })
      }
      throw err
    }
  } catch (error: any) {
    const msg = error?.message || ''
    // Não retornar 503 aqui — a criação já tem fallback
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

    try {
  const plan = await prisma.subscriptionPlan.update({
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
    } catch (err: any) {
      const msg = err?.message || ''
      if ((err as Prisma.PrismaClientKnownRequestError)?.code === 'P2021' || (err as Prisma.PrismaClientKnownRequestError)?.code === 'P2022' || /doesn't exist|does not exist|Unknown table/i.test(msg)) {
        // Fallback: atualiza somente campos básicos e ignora SET de serviços
  const plan = await prisma.subscriptionPlan.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(price !== undefined && { price }),
            ...(cycleInDays !== undefined && { cycleInDays }),
            ...(isActive !== undefined && { isActive }),
          },
          include: { services: true },
        })
        return NextResponse.json({ plan, warning: 'Plano atualizado sem modificar serviços pois a tabela de junção não está disponível. Aplique a migração e edite o plano para gerenciar serviços.' })
      }
      throw err
    }
  } catch (error: any) {
    const msg = error?.message || ''
    // Não retornar 503 no PUT; já há fallback
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

  await prisma.subscriptionPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error instanceof AuthError ? error.status : 500
    return NextResponse.json({ message: error?.message || 'Erro ao remover plano' }, { status })
  }
}
