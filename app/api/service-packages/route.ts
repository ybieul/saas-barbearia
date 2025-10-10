import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Helper: ensure only OWNER can manage service packages
function ensureOwner(role: string) {
  if (role !== 'OWNER') {
    const err: any = new Error('Acesso negado: apenas o dono pode gerenciar pacotes.')
    err.status = 403
    throw err
  }
}

// GET - Lista pacotes do tenant com serviços e contagem de compras
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    ensureOwner(user.role)

    const packages = await prisma.servicePackage.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, price: true, duration: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ packages })
  } catch (error: any) {
    console.error('Erro ao listar pacotes:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// POST - Cria pacote com serviços+quantidades
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    ensureOwner(user.role)

    const body = await request.json()
  const { name, description, totalPrice, discount, validDays, isActive, services, defaultCredits } = body || {}

    if (!name || !totalPrice || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ message: 'Nome, preço total e ao menos um serviço são obrigatórios' }, { status: 400 })
    }

    const created = await prisma.servicePackage.create({
      data: ({
        name,
        description,
        totalPrice: parseFloat(totalPrice),
        discount: discount != null ? parseFloat(discount) : 0,
        validDays: validDays != null ? parseInt(String(validDays)) : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        // Campo novo pode não existir no client gerado ainda
        defaultCredits: defaultCredits != null ? parseInt(String(defaultCredits)) : undefined,
        tenantId: user.tenantId,
        services: {
          create: services.map((s: any) => ({ serviceId: s.serviceId, quantity: parseInt(String(s.quantity || 1)) }))
        }
      } as any),
      include: {
        services: { include: { service: { select: { id: true, name: true } } } }
      }
    })

    return NextResponse.json({ package: created, message: 'Pacote criado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao criar pacote:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// PUT - Atualiza pacote e redefine serviços+quantidades
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    ensureOwner(user.role)

    const body = await request.json()
  const { id, name, description, totalPrice, discount, validDays, isActive, services, defaultCredits } = body || {}
    if (!id) {
      return NextResponse.json({ message: 'ID do pacote é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.servicePackage.findFirst({ where: { id, tenantId: user.tenantId }, include: { services: true } })
    if (!existing) {
      return NextResponse.json({ message: 'Pacote não encontrado' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Atualiza dados básicos
      const base = await tx.servicePackage.update({
        where: { id },
        data: ({
          name,
          description,
          totalPrice: totalPrice != null ? parseFloat(totalPrice) : undefined,
          discount: discount != null ? parseFloat(discount) : undefined,
          validDays: validDays != null ? parseInt(String(validDays)) : undefined,
          isActive,
          // Campo novo pode não existir no client gerado ainda
          defaultCredits: defaultCredits != null ? parseInt(String(defaultCredits)) : undefined
        } as any)
      })

      // Redefine serviços se enviados
      if (Array.isArray(services)) {
        await tx.servicePackageService.deleteMany({ where: { servicePackageId: id } })
        if (services.length > 0) {
          await tx.servicePackageService.createMany({
            data: services.map((s: any) => ({ servicePackageId: id, serviceId: s.serviceId, quantity: parseInt(String(s.quantity || 1)) }))
          })
        }
      }

      return tx.servicePackage.findUnique({
        where: { id },
        include: { services: { include: { service: { select: { id: true, name: true, price: true } } } } }
      })
    })

    return NextResponse.json({ package: updated, message: 'Pacote atualizado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao atualizar pacote:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}

// DELETE - Remove pacote se não houver compras
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    ensureOwner(user.role)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'ID é obrigatório' }, { status: 400 })

    const pkg = await prisma.servicePackage.findFirst({ where: { id, tenantId: user.tenantId } })
    if (!pkg) return NextResponse.json({ message: 'Pacote não encontrado' }, { status: 404 })

    // servicePackageServices serão removidos por ON DELETE CASCADE definido no schema
    await prisma.servicePackage.delete({ where: { id } })
    return NextResponse.json({ message: 'Pacote removido com sucesso' })
  } catch (error: any) {
    console.error('Erro ao remover pacote:', error)
    const status = error?.status || (error?.message?.includes('Token') ? 401 : 500)
    return NextResponse.json({ message: error?.message || 'Erro interno' }, { status })
  }
}
