import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/clients/quick-create
// Cria rapidamente um cliente de balcão (walk-in) com nome e telefone opcionais
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { name, phone } = await request.json()

    const safeName = (name || 'Cliente de Balcão').toString().trim().slice(0, 80)
    const safePhone = (phone || '').toString().trim().slice(0, 30)

    const client = await prisma.endUser.create({
      data: {
        name: safeName,
        phone: safePhone || '---',
        tenantId: user.tenantId,
        isActive: true,
        // @ts-ignore (campo existe após migration)
        isWalkIn: true,
        createdByProfessionalId: user.role === 'COLLABORATOR' ? user.professionalId : null
      },
      select: { id: true, name: true, phone: true }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Erro quick-create cliente:', error)
    return NextResponse.json({ message: 'Falha ao criar cliente rápido' }, { status: 500 })
  }
}
