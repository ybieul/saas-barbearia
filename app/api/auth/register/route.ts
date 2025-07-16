import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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

    // Criar tenant (dono da barbearia)
    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        businessName,
        phone,
        role: 'OWNER',
        isActive: true
      }
    })

    // Gerar JWT token com tenantId
    const token = jwt.sign(
      { 
        userId: tenant.id, 
        tenantId: tenant.id,
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
      phone: tenant.phone,
      role: tenant.role,
      tenantId: tenant.id
    }

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
