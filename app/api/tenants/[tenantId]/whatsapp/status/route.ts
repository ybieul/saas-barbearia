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

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Autenticação
    const user = verifyToken(request)
    
    if (!user || user.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { tenantId } = params
    const instanceName = `tenant_${tenantId}`

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
        // NOTA: Esta operação será habilitada após a migração no servidor
        // await prisma.tenant.update({
        //   where: { id: tenantId },
        //   data: { 
        //     whatsapp_instance_name: instanceName 
        //   }
        // })
        console.log(`✅ [API] WhatsApp conectado para tenant ${tenantId}`)
        console.log(`⚠️  [API] LEMBRETE: Salvar instanceName '${instanceName}' no banco após migração`)
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
