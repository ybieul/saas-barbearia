import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyToken, AuthError } from '@/lib/auth'

// PUT /api/professionals/[id]/access
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = verifyToken(request)

    // Apenas o OWNER raiz (tenant) pode alterar credenciais e papel.
    // (Um profissional promovido a OWNER não deve poder alterar papéis de outros.)
    if (!(authUser.role === 'OWNER' && !authUser.professionalId)) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const professionalId = params.id
    if (!professionalId) {
      return NextResponse.json({ message: 'ID do profissional é obrigatório' }, { status: 400 })
    }

  const { email, password, role } = await request.json()

    if (!email && !password && !role) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 })
    }

    // Verifica se profissional pertence ao tenant
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: authUser.tenantId }
    })

    if (!professional) {
      return NextResponse.json({ message: 'Profissional não encontrado' }, { status: 404 })
    }

    // Se email fornecido, validar unicidade dentro do tenant
    if (email) {
      const emailExists = await prisma.professional.findFirst({
        where: { email, tenantId: authUser.tenantId, id: { not: professionalId } }
      })
      if (emailExists) {
        return NextResponse.json({ message: 'Já existe um profissional com este email' }, { status: 409 })
      }
    }

    let hashed: string | undefined
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ message: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
      }
      hashed = await bcrypt.hash(password, 10)
    }

    let newRole = professional.role || 'COLLABORATOR'
    if (role) {
      const upperRole = String(role).toUpperCase()
      if (!['OWNER', 'COLLABORATOR'].includes(upperRole)) {
        return NextResponse.json({ message: 'Papel inválido' }, { status: 400 })
      }
      newRole = upperRole
    }

    const updated = await prisma.professional.update({
      where: { id: professionalId },
      data: {
        email: email ?? professional.email,
        password: hashed ?? professional.password,
        role: newRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        role: true
      }
    })

    return NextResponse.json({ professional: updated, message: 'Credenciais atualizadas com sucesso' })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('Erro ao atualizar credenciais do profissional:', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
