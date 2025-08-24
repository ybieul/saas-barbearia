import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Buscar configurações de automação do estabelecimento
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    // Buscar todas as configurações de automação do tenant
    const automationSettings = await prisma.$queryRaw`
      SELECT automation_type as automationType, is_enabled as isEnabled, message_template as messageTemplate
      FROM automation_settings 
      WHERE establishment_id = ${user.tenantId}
    ` as any[]

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
    console.error('Erro ao buscar configurações de automação:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Atualizar configuração de automação
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
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

    // Upsert (inserir ou atualizar) a configuração
    await prisma.$executeRaw`
      INSERT INTO automation_settings (id, establishment_id, automation_type, is_enabled, message_template, created_at, updated_at)
      VALUES (
        ${generateId()}, 
        ${user.tenantId}, 
        ${automationType}, 
        ${isEnabled}, 
        ${messageTemplate || null},
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        is_enabled = ${isEnabled},
        message_template = ${messageTemplate || null},
        updated_at = NOW()
    `

    return NextResponse.json({ 
      message: 'Configuração atualizada com sucesso',
      automationType,
      isEnabled,
      messageTemplate 
    })
    
  } catch (error) {
    console.error('Erro ao atualizar configuração de automação:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// Função para gerar ID único
function generateId(): string {
  return require('crypto').randomBytes(12).toString('base64url')
}
