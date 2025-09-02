import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validação básica
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim()

    console.log(`🔑 Solicitação de redefinição de senha para: ${normalizedEmail}`)

    // Buscar tenant pelo email
    const tenant = await prisma.tenant.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    })

    // IMPORTANTE: Sempre retornar sucesso, mesmo se o email não existir
    // Isso previne ataques de enumeração de emails
    if (!tenant) {
      console.log(`⚠️ Email não encontrado: ${normalizedEmail}`)
      return NextResponse.json({
        message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.'
      })
    }

    // Verificar se a conta está ativa
    if (!tenant.isActive) {
      console.log(`⚠️ Tentativa de redefinição para conta inativa: ${normalizedEmail}`)
      return NextResponse.json({
        message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.'
      })
    }

    // Gerar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date()
    resetExpires.setHours(resetExpires.getHours() + 1) // 1 hora de validade

    console.log(`🎫 Token gerado para ${normalizedEmail}: ${resetToken.substring(0, 8)}...`)

    // Salvar token no banco de dados
    await prisma.$executeRaw`
      UPDATE tenants 
      SET 
        passwordResetToken = ${resetToken},
        passwordResetExpires = ${resetExpires},
        updatedAt = ${new Date()}
      WHERE id = ${tenant.id}
    `

    // Enviar email de redefinição
    const emailSent = await sendPasswordResetEmail(
      tenant.name,
      tenant.email,
      resetToken
    )

    if (!emailSent) {
      console.error(`❌ Falha ao enviar email para: ${normalizedEmail}`)
      // Limpar token se o email falhar
      await prisma.$executeRaw`
        UPDATE tenants 
        SET 
          passwordResetToken = NULL,
          passwordResetExpires = NULL
        WHERE id = ${tenant.id}
      `
      
      return NextResponse.json(
        { error: 'Erro interno. Tente novamente mais tarde.' },
        { status: 500 }
      )
    }

    console.log(`✅ Email de redefinição enviado para: ${normalizedEmail}`)

    return NextResponse.json({
      message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.'
    })

  } catch (error) {
    console.error('❌ Erro ao processar solicitação de redefinição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
