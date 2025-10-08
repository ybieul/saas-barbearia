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

    // 1) Tentar autenticar como Tenant (OWNER)
    const tenant = await prisma.tenant.findUnique({ where: { email } })

    let authType: 'OWNER' | 'COLLABORATOR' | null = null
    let subscriptionStatus: string | null = null
    let jwtPayload: any = {}
    let userResponse: any = {}

    if (tenant) {
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
      authType = 'OWNER'
      const now = new Date()
      const isExpired = tenant.subscriptionEnd ? tenant.subscriptionEnd < now : false
      subscriptionStatus = !tenant.isActive
        ? 'inactive'
        : isExpired
          ? 'expired'
          : 'active'

      jwtPayload = {
        userId: tenant.id,
        tenantId: tenant.id,
        email: tenant.email,
        role: 'OWNER',
        isActive: tenant.isActive,
        businessPlan: tenant.businessPlan,
        subscriptionEnd: tenant.subscriptionEnd ? tenant.subscriptionEnd.toISOString() : null,
        subscriptionStatus
      }

      userResponse = {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        businessName: tenant.businessName,
        avatar: tenant.avatar,
        role: 'OWNER',
        tenantId: tenant.id,
        isActive: tenant.isActive,
        businessPlan: tenant.businessPlan,
        subscriptionEnd: tenant.subscriptionEnd
      }
    } else {
      // 2) Não é Tenant: tentar autenticar como Professional (COLLABORATOR)
      const professional = await prisma.professional.findFirst({
        where: { email },
        include: { tenant: true }
      })

      if (!professional || !professional.password) {
        return NextResponse.json(
          { 
            message: 'E-mail não encontrado. Você ainda não possui cadastro.',
            suggestion: 'Peça ao responsável que crie um acesso para você.',
            needsRegistration: true
          },
          { status: 401 }
        )
      }

      const isPasswordValid = await bcrypt.compare(password, professional.password)
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

  authType = professional.role === 'OWNER' ? 'OWNER' : 'COLLABORATOR'

      // Status de assinatura deriva do tenant dono
      const now = new Date()
      const isExpired = professional.tenant.subscriptionEnd ? professional.tenant.subscriptionEnd < now : false
      subscriptionStatus = !professional.tenant.isActive
        ? 'inactive'
        : isExpired
          ? 'expired'
          : 'active'

      jwtPayload = {
        userId: professional.id,
        tenantId: professional.tenantId,
        professionalId: professional.id,
        email: professional.email,
        role: professional.role || 'COLLABORATOR',
        isActive: professional.tenant.isActive,
        businessPlan: professional.tenant.businessPlan,
        subscriptionEnd: professional.tenant.subscriptionEnd ? professional.tenant.subscriptionEnd.toISOString() : null,
        subscriptionStatus
      }

      userResponse = {
        id: professional.id,
        name: professional.name,
        email: professional.email,
        businessName: professional.tenant.businessName,
        avatar: professional.avatar,
        role: professional.role || 'COLLABORATOR',
        tenantId: professional.tenantId,
        professionalId: professional.id,
        isActive: professional.tenant.isActive,
        businessPlan: professional.tenant.businessPlan,
        subscriptionEnd: professional.tenant.subscriptionEnd
      }
    }

    const token = jwt.sign(jwtPayload, process.env.NEXTAUTH_SECRET || 'fallback-secret', { expiresIn: '7d' })

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
