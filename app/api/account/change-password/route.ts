import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, type AuthUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    let authResult: AuthUser
    try {
      authResult = verifyToken(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    // Validações básicas
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Senha atual é obrigatória' },
        { status: 400 }
      )
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Nova senha é obrigatória' },
        { status: 400 }
      )
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { error: 'Confirmação de senha é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se as senhas coincidem
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'A nova senha e a confirmação não coincidem' },
        { status: 400 }
      )
    }

    // Validar força da nova senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se a nova senha é diferente da atual
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'A nova senha deve ser diferente da senha atual' },
        { status: 400 }
      )
    }

    console.log(`🔐 Tentativa de alteração de senha para tenant: ${authResult.tenantId}`)

    // Buscar tenant com senha atual
    const tenant = await prisma.tenant.findUnique({
      where: { 
        id: authResult.tenantId,
        isActive: true 
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, tenant.password)
    
    if (!isCurrentPasswordValid) {
      console.log(`❌ Senha atual incorreta para: ${tenant.email}`)
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 400 }
      )
    }

    // Gerar hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Atualizar senha no banco
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Senha alterada com sucesso para: ${tenant.email}`)

    return NextResponse.json({
      message: 'Senha alterada com sucesso!'
    })

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
