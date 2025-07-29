import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar cliente por telefone
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const businessSlug = searchParams.get('businessSlug')

    if (!phone || !businessSlug) {
      return NextResponse.json(
        { message: 'Telefone e slug do negócio são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar tenant por ID
    const business = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: businessSlug },
          { email: businessSlug }
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

    // Buscar cliente por telefone
    const client = await prisma.endUser.findFirst({
      where: {
        tenantId: business.id,
        phone: phone,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { message: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)

  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
