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
  console.log("--- INICIANDO VERIFICAÇÃO DE PERMISSÃO (STATUS) ---")
  
  // Tentar obter token do header Authorization
  let token = request.headers.get('authorization')?.replace('Bearer ', '')
  console.log("1. Token do Authorization header:", token ? "✅ Encontrado" : "❌ Não encontrado")
  
  // Se não tiver no header, tentar obter do cookie
  if (!token) {
    token = request.cookies.get('token')?.value
    console.log("1.1. Token do cookie:", token ? "✅ Encontrado" : "❌ Não encontrado")
  }
  
  // Se ainda não tiver, tentar obter do header x-auth-token
  if (!token) {
    token = request.headers.get('x-auth-token') || undefined
    console.log("1.2. Token do x-auth-token header:", token ? "✅ Encontrado" : "❌ Não encontrado")
  }

  console.log("2. Token final obtido:", token ? `✅ ${token.substring(0, 20)}...` : "❌ Nenhum token")

  if (!token) {
    console.log("❌ ERRO: Token não fornecido")
    throw new Error('Token não fornecido')
  }

  try {
    console.log("3. Tentando decodificar token...")
    console.log("3.1. NEXTAUTH_SECRET existe:", process.env.NEXTAUTH_SECRET ? "✅ Sim" : "❌ Não")
    
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    
    console.log("4. ✅ Token decodificado com sucesso:")
    console.log("4.1. userId:", decoded.userId)
    console.log("4.2. tenantId:", decoded.tenantId) 
    console.log("4.3. email:", decoded.email)
    console.log("4.4. role:", decoded.role)
    
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error: any) {
    console.error("❌ ERRO na validação do token:")
    console.error("5.1. Tipo do erro:", error.name)
    console.error("5.2. Mensagem:", error.message)
    console.error("5.3. Stack:", error.stack)
    throw new Error('Token inválido')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    console.log("=== ROTA GET STATUS INICIADA ===")
    
    // Autenticação
    console.log("6. Iniciando verificação de token...")
    const user = verifyToken(request)
    console.log("7. ✅ Token verificado com sucesso")
    
    console.log("8. Verificando permissão para tenant...")
    console.log("8.1. Tenant ID da URL:", params.tenantId)
    console.log("8.2. Tenant ID do token:", user.tenantId)
    
    if (!user || user.tenantId !== params.tenantId) {
      console.log("❌ ERRO 403: Permissão negada")
      console.log("8.3. User existe:", !!user)
      console.log("8.4. IDs correspondem:", user?.tenantId === params.tenantId)
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    console.log("9. ✅ Permissão verificada - usuário autorizado")
    console.log("--- VERIFICAÇÃO DE PERMISSÃO BEM-SUCEDIDA ---")

    const { tenantId } = params
    
    // Obter instanceName do query param ou gerar padrão
    const url = new URL(request.url)
    const queryInstanceName = url.searchParams.get('instanceName')
    const instanceName = queryInstanceName || `tenant_${tenantId}`

    // Verificar variáveis de ambiente da Evolution API
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionURL || !evolutionKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    // Verificar status da instância na Evolution API
    const statusUrl = `${evolutionURL}/instance/connectionState/${instanceName}`
    
    console.log(`🔍 [API] Verificando status da instância: ${instanceName}`)

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.error(`❌ [API] Erro ao verificar status: ${response.status}`)
      return NextResponse.json(
        { 
          connected: false,
          instanceName: instanceName,
          error: `Erro na Evolution API: ${response.status}`
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('📋 [API] Status da instância:', data)
    
    const isConnected = data.instance?.state === 'open' || data.state === 'open'
    
    // Se estiver conectado, atualizar o banco com o instanceName
    if (isConnected) {
      try {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            whatsapp_instance_name: instanceName 
          }
        })
        console.log(`✅ [API] WhatsApp conectado para tenant ${tenantId} - instanceName salvo no banco`)
      } catch (dbError) {
        console.error('❌ [API] Erro ao atualizar banco:', dbError)
      }
    }

    return NextResponse.json({
      connected: isConnected,
      instanceName: instanceName,
      status: data.instance?.state || data.state,
      error: !isConnected ? `Status: ${data.instance?.state || data.state}` : undefined,
      data: {
        tenantId: tenantId,
        instanceName: instanceName,
        lastCheck: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error("❌ ERRO GERAL na rota GET status:")
    console.error("10.1. Nome do erro:", error.name)
    console.error("10.2. Mensagem:", error.message)
    console.error("10.3. Stack completo:", error.stack)
    
    // Se o erro for de autenticação, retornar 401
    if (error.message?.includes('Token não fornecido') || error.message?.includes('Token inválido')) {
      console.log("10.4. ❌ Retornando 401 - Erro de autenticação")
      return NextResponse.json(
        { 
          error: 'Token de autenticação inválido ou expirado',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined
        },
        { status: 401 }
      )
    }
    
    console.log("10.4. ❌ Retornando 500 - Erro interno")
    console.error('❌ [API] Erro ao verificar status WhatsApp:', error)
    
    return NextResponse.json(
      { 
        connected: false,
        error: 'Erro ao verificar status da conexão WhatsApp',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
