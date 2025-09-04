import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar tenant no banco (corrigido para usar Tenant ao invés de User)
    const tenant = await prisma.tenant.findUnique({
      where: { email }
    })

    if (!tenant) {
      return NextResponse.json(
        { 
          message: 'E-mail não encontrado. Você ainda não possui cadastro.',
          suggestion: 'Clique em "Cadastre-se grátis" para criar sua conta.',
          needsRegistration: true
        },
        { status: 401 }
      )
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, tenant.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          message: 'Senha incorreta. Verifique suas credenciais.',
          suggestion: 'Certifique-se de que digitou a senha corretamente.',
          needsRegistration: false
        },
        { status: 401 }
      )
    }

    // NÃO bloquear login para conta inativa/expirada: apenas marcar status para o frontend redirecionar
    const now = new Date()
    const isExpired = tenant.subscriptionEnd ? tenant.subscriptionEnd < now : false
    const subscriptionStatus = !tenant.isActive
      ? 'inactive'
      : isExpired
        ? 'expired'
        : 'active'

    // Gerar JWT token enriquecido com estado de assinatura
    const token = jwt.sign(
      { 
        userId: tenant.id, 
        tenantId: tenant.id, // multi-tenant
        email: tenant.email,
        role: tenant.role,
        isActive: tenant.isActive, // ainda carrega isActive (false se inativa)
        businessPlan: tenant.businessPlan,
        subscriptionEnd: tenant.subscriptionEnd ? tenant.subscriptionEnd.toISOString() : null,
        subscriptionStatus
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    const userResponse = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      businessName: tenant.businessName,
      avatar: tenant.avatar,
      role: tenant.role,
      tenantId: tenant.id,
      isActive: tenant.isActive,
      businessPlan: tenant.businessPlan,
      subscriptionEnd: tenant.subscriptionEnd
    }

    return NextResponse.json({
      user: userResponse,
      token,
      subscriptionStatus,
      message: subscriptionStatus === 'active' 
        ? 'Login realizado com sucesso' 
        : subscriptionStatus === 'expired'
          ? 'Login realizado. Assinatura expirada.'
          : 'Login realizado. Conta inativa.'
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
