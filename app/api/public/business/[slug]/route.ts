import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar dados do negócio por slug (ID do tenant)
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

    // Buscar tenant por ID (usando slug como ID por enquanto)
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: slug },
          { email: slug } // Fallback para busca por email
        ],
        isActive: true
      },
      select: {
        id: true,
        businessName: true,
        businessPhone: true,
        businessAddress: true,
        businessLogo: true,
        businessConfig: true
      }
    })

    if (!business) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado ou inativo' },
        { status: 404 }
      )
    }

    return NextResponse.json(business)

  } catch (error) {
    console.error('❌ Erro ao buscar dados do negócio:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
