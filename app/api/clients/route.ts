import { prisma } from '@/lib/prisma'
import { parseBirthDate } from '@/lib/timezone'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar clientes (EndUsers) do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    const clients = await prisma.endUser.findMany({
      where: {
        tenantId: user.tenantId, // Filtro multi-tenant
        ...(active !== null && { isActive: active === 'true' })
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthday: true,
        notes: true,
        isActive: true,
        createdAt: true,
        // ✅ CAMPOS AGREGADOS REAIS DO BANCO
        totalSpent: true,
        totalVisits: true,
        lastVisit: true,
        // ✅ APPOINTMENTS REMOVIDOS - NÃO NECESSÁRIOS PARA LISTAGEM
        // appointments são desnecessários aqui, causam problema de performance
      }
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar cliente (EndUser)
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { name, email, phone, birthday, notes, address, cpf } = await request.json()

    if (!name || !phone) {
      return NextResponse.json(
        { message: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe cliente com o mesmo telefone no tenant
    const existingClient = await prisma.endUser.findFirst({
      where: {
        tenantId: user.tenantId,
        phone
      }
    })

    if (existingClient) {
      return NextResponse.json(
        { message: 'Já existe um cliente com este telefone' },
        { status: 409 }
      )
    }

    const client = await prisma.endUser.create({
      data: {
        name,
        email,
        phone,
        birthday: birthday ? parseBirthDate(birthday) : null,
        notes,
        address,
        cpf,
        tenantId: user.tenantId, // Associar ao tenant
        isActive: true
      }
    })

    return NextResponse.json({ client, message: 'Cliente criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar cliente (EndUser)
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { id, name, email, phone, birthday, notes, isActive, address, cpf } = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o cliente pertence ao tenant
    const existingClient = await prisma.endUser.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { message: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    const client = await prisma.endUser.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        birthday: birthday ? parseBirthDate(birthday) : null,
        notes,
        isActive,
        address,
        cpf
      }
    })

    return NextResponse.json({ client, message: 'Cliente atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Remover cliente (EndUser)
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o cliente pertence ao tenant
    const existingClient = await prisma.endUser.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { message: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    await prisma.endUser.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Cliente removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover cliente:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
