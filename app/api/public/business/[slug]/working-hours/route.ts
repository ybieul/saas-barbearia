import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar horários de funcionamento do negócio
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

    // Buscar horários de funcionamento
    const workingHours = await prisma.workingHours.findMany({
      where: {
        tenantId: business.id
      },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    return NextResponse.json(workingHours)

  } catch (error) {
    console.error('❌ Erro ao buscar horários de funcionamento:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
