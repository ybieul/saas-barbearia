import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PUT /api/me/change-password
export async function PUT(request: NextRequest) {
  try {
    const authUser = verifyToken(request)

    if (authUser.role !== 'COLLABORATOR' || !authUser.professionalId) {
      return NextResponse.json({ message: 'Apenas colaboradores podem alterar a própria senha.' }, { status: 403 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    const professional = await prisma.professional.findFirst({
      where: { id: authUser.professionalId, tenantId: authUser.tenantId },
      select: { id: true, password: true }
    })

    if (!professional || !professional.password) {
      return NextResponse.json({ message: 'Credenciais não configuradas.' }, { status: 400 })
    }

    const valid = await bcrypt.compare(currentPassword, professional.password)
    if (!valid) {
      return NextResponse.json({ message: 'Senha atual incorreta.' }, { status: 401 })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.professional.update({
      where: { id: professional.id },
      data: { password: hashed }
    })

    return NextResponse.json({ message: 'Senha atualizada com sucesso.' })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('Erro ao alterar senha do colaborador:', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
