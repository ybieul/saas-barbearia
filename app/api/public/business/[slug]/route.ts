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
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        email,
        businessName, 
        businessPhone, 
        businessAddress, 
        businessLogo, 
        businessInstagram,
        businessConfig,
        businessPlan,
        subscriptionEnd
      FROM tenants 
      WHERE isActive = 1 
      AND JSON_EXTRACT(businessConfig, '$.customLink') = ${slug}
    ` as any[]

    if (!result || result.length === 0) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado ou inativo' },
        { status: 404 }
      )
    }

    const business = result[0]

    // Retornar dados estruturados sem spread do objeto completo
    const responseData = {
      id: business.id,
      name: business.name,
      email: business.email,
      businessName: business.businessName,
      businessPhone: business.businessPhone,
      businessAddress: business.businessAddress,
      businessLogo: business.businessLogo,
      businessInstagram: business.businessInstagram,
      businessPlan: business.businessPlan,
      subscriptionEnd: business.subscriptionEnd
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Erro ao buscar dados do negócio:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
