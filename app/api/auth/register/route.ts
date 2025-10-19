import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendTrialWelcomeEmail, generateSecurePassword, sendEmail } from '@/lib/email'
import { welcomeTrialEmail } from '@/utils/emailTemplates'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, businessName, phone } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se tenant já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { email }
    })

    if (existingTenant) {
      return NextResponse.json(
        { message: 'Usuário já existe com este email' },
        { status: 409 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Calcular data de término do TRIAL (15 dias a partir de agora)
    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

    // Criar tenant (dono da barbearia) em modo de teste
    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        businessName,
        phone,
        role: 'OWNER',
        // Plano e status do trial
        businessPlan: 'TRIAL',
        subscriptionStatus: 'TRIAL',
        subscriptionEnd: trialEnd,
        // Ativo durante o período de teste
        isActive: true
      }
    })

    // Disparar e-mail de boas-vindas e onboarding (agradecimento + próximos passos)
    try {
      const html = welcomeTrialEmail({ tenantName: tenant.name })
      await sendEmail({
        to: tenant.email,
        subject: `🎉 Bem-vindo ao TymerBook, ${tenant.name}!`,
        html
      })
      console.log(`✅ E-mail de boas-vindas (onboarding) enviado para ${tenant.email}`)
    } catch (emailError) {
      console.error('⚠️ Falha ao enviar e-mail de boas-vindas (onboarding), mas o registro foi criado:', emailError)
      // Não retornar erro: o usuário já foi criado com sucesso
    }

    // Gerar JWT token enriquecido (inclui status da assinatura)
    const token = jwt.sign(
      { 
        userId: tenant.id, 
        tenantId: tenant.id,
        email: tenant.email,
        role: tenant.role,
        isActive: tenant.isActive,
        businessPlan: tenant.businessPlan,
        subscriptionEnd: tenant.subscriptionEnd ? tenant.subscriptionEnd.toISOString() : null,
        subscriptionStatus: 'TRIAL'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    const userResponse = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      businessName: tenant.businessName,
      phone: tenant.phone,
      role: tenant.role,
      tenantId: tenant.id,
      isActive: tenant.isActive,
      businessPlan: tenant.businessPlan,
      subscriptionEnd: tenant.subscriptionEnd,
      subscriptionStatus: 'TRIAL'
    }

    // Enviar email de boas-vindas ao trial com credenciais (não bloqueia a resposta)
    sendTrialWelcomeEmail(
      tenant.name,
      tenant.email,
      password, // Senha original (não hasheada) para o email
      trialEnd
    ).catch(err => {
      console.error('Erro ao enviar email de boas-vindas trial:', err)
      // Não falha o registro se o email falhar
    })

    return NextResponse.json({
      user: userResponse,
      token,
      message: 'Conta criada com sucesso'
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
