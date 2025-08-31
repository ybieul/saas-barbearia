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

    // Verificar se tenant está ativo
    if (!tenant.isActive) {
      return NextResponse.json(
        { message: 'Conta inativa. Entre em contato com o suporte.' },
        { status: 403 }
      )
    }

    // Gerar JWT token com tenantId
    const token = jwt.sign(
      { 
        userId: tenant.id, 
        tenantId: tenant.id, // Incluir tenantId para multi-tenant
        email: tenant.email,
        role: tenant.role 
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
      tenantId: tenant.id
    }

    // ✅ Criar resposta JSON
    const response = NextResponse.json({
      user: userResponse,
      token,
      message: 'Login realizado com sucesso'
    })

    // ✅ CORREÇÃO: Definir cookie httpOnly para o middleware
    // Configuração segura do cookie para produção
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction ? '__Secure-auth-token' : 'auth_token'
    
    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true, // Importante: não acessível via JavaScript (segurança)
      secure: isProduction, // HTTPS apenas em produção
      sameSite: 'lax', // Proteção contra CSRF
      path: '/', // Disponível em todo o domínio
      domain: isProduction ? '.tymerbook.com' : 'localhost', // Funciona em subdomínios
      maxAge: 60 * 60 * 24 * 7 // 7 dias (mesmo tempo do JWT)
    })

    console.log("✅ Login bem-sucedido:", {
      usuario: tenant.email,
      cookieDefinido: cookieName,
      ambiente: isProduction ? 'produção' : 'desenvolvimento'
    })

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
