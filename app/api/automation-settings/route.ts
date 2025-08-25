import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

function verifyToken(request: NextRequest): AuthUser {
  // Tentar obter token do header Authorization
  let token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Se não tiver no header, tentar obter do cookie
  if (!token) {
    token = request.cookies.get('token')?.value
  }
  
  // Se ainda não tiver, tentar obter do header x-auth-token
  if (!token) {
    token = request.headers.get('x-auth-token') || undefined
  }

  console.log('🔍 [API] Verificando token:', token ? '✅ Token encontrado' : '❌ Token não encontrado')

  if (!token) {
    throw new Error('Token não fornecido')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    
    if (!decoded.tenantId) {
      throw new Error('Token inválido: tenantId não encontrado')
    }

    console.log('✅ [API] Token válido para usuário:', decoded.email)

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    console.error('❌ [API] Erro ao verificar token:', error)
    throw new Error('Token inválido')
  }
}

// GET - Buscar configurações de automação do estabelecimento
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    console.log('✅ [API] Usuário autenticado para GET settings:', user.email)
    
    // Buscar todas as configurações de automação do tenant
    const automationSettings = await prisma.$queryRaw`
      SELECT automationType, isEnabled, messageTemplate
      FROM automation_settings 
      WHERE establishmentId = ${user.tenantId}
    ` as any[]

    console.log('📋 [API] Configurações encontradas:', automationSettings.length)

    // Tipos de automação disponíveis
    const availableAutomations = [
      'confirmation',
      'reminder_24h', 
      'reminder_12h',
      'reminder_2h',
      'reactivation'
    ]

    // Criar resposta com todas as automações, marcando como false se não existir
    const response = availableAutomations.reduce((acc, automationType) => {
      const setting = automationSettings.find(s => s.automationType === automationType)
      acc[automationType] = {
        isEnabled: setting?.isEnabled ?? false,
        messageTemplate: setting?.messageTemplate || null
      }
      return acc
    }, {} as Record<string, { isEnabled: boolean; messageTemplate: string | null }>)

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ [API] Erro ao buscar configurações de automação:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Atualizar configuração de automação
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    console.log('✅ [API] Usuário autenticado para POST settings:', user.email)
    
    const { automationType, isEnabled, messageTemplate } = await request.json()

    if (!automationType || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { message: 'automationType e isEnabled são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo de automação
    const validTypes = ['confirmation', 'reminder_24h', 'reminder_12h', 'reminder_2h', 'reactivation']
    if (!validTypes.includes(automationType)) {
      return NextResponse.json(
        { message: 'Tipo de automação inválido' },
        { status: 400 }
      )
    }

    console.log(`📝 [API] Salvando configuração: ${automationType} = ${isEnabled} para tenant ${user.tenantId}`)

    // Verificar se a configuração já existe
    const existingSetting = await prisma.$queryRaw`
      SELECT id FROM automation_settings 
      WHERE establishmentId = ${user.tenantId} 
      AND automationType = ${automationType}
      LIMIT 1
    ` as any[]

    if (existingSetting.length > 0) {
      // Atualizar configuração existente
      console.log('📝 [API] Atualizando configuração existente')
      await prisma.$executeRaw`
        UPDATE automation_settings 
        SET isEnabled = ${isEnabled}, 
            messageTemplate = ${messageTemplate || null},
            updatedAt = NOW()
        WHERE establishmentId = ${user.tenantId} 
        AND automationType = ${automationType}
      `
    } else {
      // Inserir nova configuração
      console.log('📝 [API] Inserindo nova configuração')
      await prisma.$executeRaw`
        INSERT INTO automation_settings (id, establishmentId, automationType, isEnabled, messageTemplate, createdAt, updatedAt)
        VALUES (
          ${generateId()}, 
          ${user.tenantId}, 
          ${automationType}, 
          ${isEnabled}, 
          ${messageTemplate || null},
          NOW(),
          NOW()
        )
      `
    }

    console.log('✅ [API] Configuração salva com sucesso')

    return NextResponse.json({ 
      message: 'Configuração atualizada com sucesso',
      automationType,
      isEnabled,
      messageTemplate 
    })
    
  } catch (error) {
    console.error('❌ [API] Erro ao atualizar configuração de automação:', error)
    
    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error('❌ Erro detalhado:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para gerar ID único
function generateId(): string {
  return require('crypto').randomBytes(12).toString('base64url')
}
