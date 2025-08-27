import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

  if (!token) {
    throw new Error('Token não fornecido')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    throw new Error('Token inválido')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // 1. Autenticação: Verificar se o usuário tem permissão
    const user = verifyToken(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { tenantId } = params

    // Verificar se o tenantId corresponde ao usuário logado
    if (user.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este tenant' },
        { status: 403 }
      )
    }

    // Verificar se o usuário tem permissão para gerenciar este tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já tem uma instância conectada
    // NOTA: Esta verificação será habilitada após a migração do banco
    // if (tenant.whatsapp_instance_name) {
    //   return NextResponse.json(
    //     { error: 'Este tenant já possui uma instância WhatsApp conectada' },
    //     { status: 400 }
    //   )
    // }

    // 2. Geração do Nome da Instância
    const instanceName = `tenant_${tenantId}`

    // 3. Verificar variáveis de ambiente da Evolution API
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionURL || !evolutionKey) {
      console.error('❌ [API] Configuração Evolution API incompleta')
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada no servidor' },
        { status: 500 }
      )
    }

    // 4. Chamada à Evolution API para criar instância
    console.log(`🔄 [API] Criando instância WhatsApp para tenant: ${tenantId}`)
    console.log(`📱 [API] Nome da instância: ${instanceName}`)

    const createInstanceUrl = `${evolutionURL}/instance/create`
    
    const payload = {
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    }

    const response = await fetch(createInstanceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      // Timeout de 30 segundos para criação da instância
      signal: AbortSignal.timeout(30000)
    })

    console.log(`📡 [API] Evolution API Response Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Erro na Evolution API:', errorText)
      
      return NextResponse.json(
        { error: `Erro ao criar instância WhatsApp: ${response.status}` },
        { status: 500 }
      )
    }

    // 5. Processar resposta da Evolution API
    const evolutionResponse = await response.json()
    console.log('✅ [API] Instância criada com sucesso:', evolutionResponse)

    // 6. Atualizar o banco de dados com o nome da instância
    // NOTA: Esta operação será habilitada após executar a migração no servidor
    // await prisma.tenant.update({
    //   where: { id: tenantId },
    //   data: { 
    //     whatsapp_instance_name: instanceName 
    //   }
    // })

    console.log(`✅ [API] Instância criada - Tenant ${tenantId} pronto para vincular à instância ${instanceName}`)
    console.log(`⚠️  [API] LEMBRETE: Execute a migração do banco no servidor para salvar o instanceName`)

    // 7. Verificar se a resposta contém QR Code
    let qrCodeData = null
    
    if (evolutionResponse.qrcode?.base64) {
      qrCodeData = evolutionResponse.qrcode.base64
    } else if (evolutionResponse.instance?.qrcode?.base64) {
      qrCodeData = evolutionResponse.instance.qrcode.base64
    } else if (evolutionResponse.base64) {
      qrCodeData = evolutionResponse.base64
    }

    // 8. Retornar dados para o frontend
    return NextResponse.json({
      success: true,
      instanceName: instanceName,
      qrcode: qrCodeData,
      message: 'Instância WhatsApp criada com sucesso. Escaneie o QR Code para conectar.',
      data: {
        tenantId: tenantId,
        instanceName: instanceName,
        createdAt: new Date().toISOString()
      },
      // Incluir resposta completa para debug (remover em produção se necessário)
      evolutionResponse: evolutionResponse
    })

  } catch (error: any) {
    console.error('❌ [API] Erro ao conectar WhatsApp:', error)
    
    // Em caso de erro, tentar remover o instance_name do banco
    // NOTA: Esta operação será habilitada após a migração no servidor
    try {
      // await prisma.tenant.update({
      //   where: { id: params.tenantId },
      //   data: { whatsapp_instance_name: null }
      // })
      console.log('⚠️  [API] Em caso de erro, lembre-se de limpar o instanceName no banco manualmente')
    } catch (cleanupError) {
      console.error('❌ [API] Erro ao limpar banco após falha:', cleanupError)
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao conectar WhatsApp',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
