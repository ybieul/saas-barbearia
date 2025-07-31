import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar profissionais do negócio
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { message: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar tenant por customLink
    const business = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: {
          path: '$.customLink',
          equals: slug
        }
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

    // Buscar profissionais ativos
    const professionals = await prisma.professional.findMany({
      where: {
        tenantId: business.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        specialty: true,
        phone: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(professionals)

  } catch (error) {
    console.error('❌ Erro ao buscar profissionais:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
