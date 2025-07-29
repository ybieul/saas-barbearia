import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar serviços do negócio
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { message: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar tenant por ID
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: slug },
          { email: slug }
        ],
        isActive: true
      },
      select: {
        id: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }

    // Buscar serviços ativos
    const services = await prisma.service.findMany({
      where: {
        tenantId: business.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        image: true,
        category: true
      },
      orderBy: [
        { category: 'asc' },
        { price: 'asc' }
      ]
    })

    return NextResponse.json(services)

  } catch (error) {
    console.error('❌ Erro ao buscar serviços:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
