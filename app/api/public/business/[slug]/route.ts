import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar dados do negócio por slug (customLink personalizado)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { message: 'Slug é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar tenant por customLink no businessConfig
    const business = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: {
          path: '$.customLink',
          equals: slug
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessPhone: true,
        businessAddress: true,
        businessLogo: true,
        businessConfig: true,
        businessPlan: true,
        subscriptionEnd: true
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
