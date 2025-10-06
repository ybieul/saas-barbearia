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
  const includeWalkIn = searchParams.get('includeWalkIn') === 'true'
  const search = (searchParams.get('search') || searchParams.get('q') || '').trim()
  const grouped = searchParams.get('grouped') === 'true'

    // Cláusula base multi-tenant
    const whereClause: any = {
      tenantId: user.tenantId,
      ...(active !== null && { isActive: active === 'true' })
    }

    // Filtro padrão: esconder walk-ins (clientes de balcão) se não solicitado
    if (!includeWalkIn) {
      whereClause.isWalkIn = false
    }

    // Busca por nome / telefone básica (caso exista parâmetro search)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // MODO AGRUPADO: usado pelo modal de agendamento (busca inteligente)
    if (grouped && search) {
      const results = await prisma.endUser.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } }
          ],
          ...(active !== null && { isActive: active === 'true' })
        },
        orderBy: { createdAt: 'desc' }
      }) as any[]

      const registeredClients = results.filter(r => r.isWalkIn === false)
      const walkInClients = results.filter(r => r.isWalkIn === true)
      return NextResponse.json({ registeredClients, walkInClients })
    }

    // Se for colaborador, filtrar apenas clientes que já tiveram atendimento com ele
    let clients
    if (user.role === 'COLLABORATOR' && user.professionalId) {
      clients = await prisma.endUser.findMany({
        where: {
          ...whereClause,
          appointments: {
            some: { professionalId: user.professionalId }
          }
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
          // @ts-ignore campo existe no banco
          isWalkIn: true,
          createdAt: true,
          totalSpent: true,
          totalVisits: true,
          lastVisit: true,
        }
      })
    } else {
      clients = await prisma.endUser.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          birthday: true,
          notes: true,
          isActive: true,
          // @ts-ignore campo existe no banco
          isWalkIn: true,
          createdAt: true,
          totalSpent: true,
          totalVisits: true,
          lastVisit: true,
        }
      })
    }

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
      // Lógica de promoção de cliente de balcão:
      // Se cliente atual é walk-in e não tinha telefone (ou placeholder) e agora foi informado um telefone válido, converte para isWalkIn: false
      data: (() => {
        const phoneProvided = typeof phone === 'string' ? phone.trim() : ''
        const hadNoPhone = !existingClient.phone || existingClient.phone.trim() === '' || existingClient.phone === '---'
        const dataToUpdate: any = {
          name,
          email,
          phone,
          birthday: birthday ? parseBirthDate(birthday) : null,
          notes,
          isActive,
          address,
          cpf
        }
  if ((existingClient as any).isWalkIn && hadNoPhone && phoneProvided) {
          // Promover
          dataToUpdate.isWalkIn = false
        }
        return dataToUpdate
      })()
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
