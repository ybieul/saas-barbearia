import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await request.json()

    // Validações básicas
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
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
        { error: 'As senhas não coincidem' },
        { status: 400 }
      )
    }

    // Validar força da senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    console.log(`🔑 Tentativa de redefinição com token: ${token.substring(0, 8)}...`)

    // Buscar tenant pelo token válido
    const tenant = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      email: string;
      passwordResetToken: string | null;
      passwordResetExpires: Date | null;
    }>>`
      SELECT id, name, email, passwordResetToken, passwordResetExpires
      FROM tenants 
      WHERE passwordResetToken = ${token}
        AND passwordResetExpires > ${new Date()}
        AND isActive = 1
    `

    if (!tenant || tenant.length === 0) {
      console.log(`❌ Token inválido ou expirado: ${token.substring(0, 8)}...`)
      return NextResponse.json(
        { error: 'Token inválido ou expirado. Solicite uma nova redefinição de senha.' },
        { status: 400 }
      )
    }

    const tenantData = tenant[0]
    console.log(`✅ Token válido para usuário: ${tenantData.email}`)

    // Gerar hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Atualizar senha e limpar tokens de redefinição
    await prisma.$executeRaw`
      UPDATE tenants 
      SET 
        password = ${hashedPassword},
        passwordResetToken = NULL,
        passwordResetExpires = NULL,
        updatedAt = ${new Date()}
      WHERE id = ${tenantData.id}
    `

    console.log(`✅ Senha redefinida com sucesso para: ${tenantData.email}`)

    return NextResponse.json({
      message: 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.'
    })

  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
