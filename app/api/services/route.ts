import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar serviços do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')

    const services = await prisma.service.findMany({
      where: {
        tenantId: user.tenantId,
        ...(active !== null && { isActive: active === 'true' }),
        ...(category && { category })
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        professionals: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      }
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar serviço
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      name, 
      description, 
      price, 
      duration, 
      category, 
      image, 
      isVisibleOnPublicPage,
      maxAdvanceBooking, 
      minAdvanceBooking,
      professionalIds 
    } = await request.json()

    if (!name || !price || !duration) {
      return NextResponse.json(
        { message: 'Nome, preço e duração são obrigatórios' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        category,
        image,
        maxAdvanceBooking: maxAdvanceBooking ? parseInt(maxAdvanceBooking) : null,
        minAdvanceBooking: minAdvanceBooking ? parseInt(minAdvanceBooking) : null,
        tenantId: user.tenantId,
  isActive: true,
  ...(typeof isVisibleOnPublicPage === 'boolean' ? { isVisibleOnPublicPage } : {}),
        ...(professionalIds && professionalIds.length > 0 && {
          professionals: {
            connect: professionalIds.map((id: string) => ({ id }))
          }
        })
      },
      include: {
        professionals: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ service, message: 'Serviço criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar serviço
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      id, 
      name, 
      description, 
      price, 
      duration, 
      category, 
  image, 
      isActive,
  isVisibleOnPublicPage,
      maxAdvanceBooking, 
      minAdvanceBooking,
      professionalIds 
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'ID do serviço é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o serviço pertence ao tenant
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingService) {
      return NextResponse.json(
        { message: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar relacionamentos com profissionais se fornecido
    const updateData: any = {
      name,
      description,
      price: price ? parseFloat(price) : undefined,
      duration: duration ? parseInt(duration) : undefined,
      category,
      image,
      isActive,
      isVisibleOnPublicPage,
      maxAdvanceBooking: maxAdvanceBooking ? parseInt(maxAdvanceBooking) : null,
      minAdvanceBooking: minAdvanceBooking ? parseInt(minAdvanceBooking) : null
    }

    if (professionalIds !== undefined) {
      updateData.professionals = {
        set: professionalIds.map((id: string) => ({ id }))
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        professionals: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ service, message: 'Serviço atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Remover serviço
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID do serviço é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o serviço pertence ao tenant
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingService) {
      return NextResponse.json(
        { message: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se há agendamentos futuros usando este serviço
    const futureAppointments = await prisma.appointment.count({
      where: {
        services: {
          some: {
            id: id
          }
        },
        dateTime: {
          gte: new Date()
        },
        status: {
          in: ['CONFIRMED']
        }
      }
    })

    if (futureAppointments > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir serviço com agendamentos futuros. Desative-o em vez de excluir.' },
        { status: 409 }
      )
    }

    await prisma.service.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Serviço removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover serviço:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
