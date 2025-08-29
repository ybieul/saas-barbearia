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
  console.log("--- INICIANDO VERIFICAÇÃO DE PERMISSÃO (CONNECT) ---")
  
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
    
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as {
      userId: string
      tenantId: string
      email: string
      role: string
    }
    
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

// Função utilitária para gerar nome da instância baseado no nome do estabelecimento
function generateInstanceName(businessName: string | null, tenantId: string): string {
  if (!businessName) {
    // Fallback para o formato antigo se não houver businessName
    return `tenant_${tenantId}`
  }
  
  // Limpar o nome do estabelecimento para usar como nome da instância
  const cleanBusinessName = businessName
    .toLowerCase() // converter para minúsculas
    .trim() // remover espaços
    .replace(/[^a-z0-9]/g, '_') // substituir caracteres especiais por underscore
    .replace(/_+/g, '_') // múltiplos underscores viram um só
    .replace(/^_|_$/g, '') // remover underscores do início e fim
    .substring(0, 20) // limitar a 20 caracteres
  
  return `${cleanBusinessName}_${tenantId}`
}

// Função utilitária para verificar status de uma instância
async function checkInstanceStatus(evolutionURL: string, evolutionKey: string, instanceName: string) {
  const statusUrl = `${evolutionURL}/instance/connectionState/${instanceName}`
  
  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'apikey': evolutionKey,
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { exists: false, state: null }
    }
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()
  const state = data.instance?.state || data.state
  return { exists: true, state, data }
}

// Função utilitária para deletar uma instância
async function deleteInstance(evolutionURL: string, evolutionKey: string, instanceName: string) {
  const deleteUrl = `${evolutionURL}/instance/delete/${instanceName}`
  
  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'apikey': evolutionKey,
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(15000)
  })

  return response.ok
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    console.log("=== ROTA POST CONNECT INICIADA ===")
    
    // 1. Autenticação: Verificar se o usuário tem permissão
    const user = verifyToken(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se o tenantId corresponde ao usuário logado
    if (user.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este tenant' },
        { status: 403 }
      )
    }

    const { tenantId } = params

    // 2. Buscar dados do tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId
      },
      select: {
        id: true,
        businessName: true,
        whatsapp_instance_name: true
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    console.log(`🏢 Estabelecimento: "${tenant.businessName}" (${tenantId})`)

    // 3. Verificar variáveis de ambiente da Evolution API
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionURL || !evolutionKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada no servidor' },
        { status: 500 }
      )
    }

    // 4. Geração do Nome da Instância
    const instanceName = generateInstanceName(tenant.businessName, tenantId)
    console.log(`🏷️ Nome da instância: "${instanceName}"`)

    // 5. NOVA LÓGICA DE 3 CENÁRIOS: Verificar status da instância existente
    console.log(`🔍 Verificando status da instância: ${instanceName}`)
    
    try {
      // Tentativa de verificar status da instância
      const statusCheck = await checkInstanceStatus(evolutionURL, evolutionKey, instanceName)
      
      if (statusCheck.exists) {
        console.log(`📋 Instância encontrada - Estado: ${statusCheck.state}`)
        
        // CENÁRIO C: Instância existe e está conectada
        if (statusCheck.state === 'open') {
          console.log('✅ CENÁRIO C: WhatsApp já conectado')
          
          return NextResponse.json({
            success: true,
            alreadyConnected: true,
            instanceName: instanceName,
            message: 'WhatsApp já está conectado com sucesso!',
            data: {
              tenantId: tenantId,
              instanceName: instanceName,
              status: statusCheck.state,
              scenario: 'C - Already Connected'
            }
          })
        } 
        
        // CENÁRIO B: Instância existe mas está desconectada
        else {
          console.log(`🔄 CENÁRIO B: Instância existe mas desconectada (${statusCheck.state})`)
          
          // Gerar novo QR Code para reconexão
          const qrResponse = await fetch(`${evolutionURL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': evolutionKey,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
          })

          if (qrResponse.ok) {
            const qrData = await qrResponse.json()
            let qrCodeData = null
            
            // Extrair QR Code da resposta
            if (qrData.base64) {
              qrCodeData = qrData.base64
            } else if (qrData.qrcode?.base64) {
              qrCodeData = qrData.qrcode.base64
            }

            return NextResponse.json({
              success: true,
              instanceName: instanceName,
              qrcode: qrCodeData,
              message: 'Nova sessão WhatsApp iniciada. Escaneie o QR Code para reconectar.',
              data: {
                tenantId: tenantId,
                instanceName: instanceName,
                scenario: 'B - Reconnection Required'
              }
            })
          } else {
            // Se falhar em gerar QR, deletar instância e criar nova
            console.log('⚠️ Falha ao gerar QR para reconexão - deletando instância')
            await deleteInstance(evolutionURL, evolutionKey, instanceName)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
    } catch (error) {
      // CENÁRIO A: Erro 404 ou instância não existe - criar nova
      console.log('� CENÁRIO A: Instância não existe - criando nova')
    }

    // CENÁRIO A: Criar nova instância
    console.log(`� Criando nova instância WhatsApp: ${instanceName}`)

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
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      console.error(`❌ Evolution API erro: ${response.status} - ${errorText}`)
      
      return NextResponse.json(
        { 
          error: `Erro ao criar instância WhatsApp`,
          details: process.env.NODE_ENV === 'development' ? 
            `Status: ${response.status}` : undefined
        },
        { status: 500 }
      )
    }
    // 6. Processar resposta da Evolution API
    const evolutionResponse = await response.json()
    console.log('✅ Instância criada com sucesso:', evolutionResponse)

    // 7. Extrair QR Code da resposta
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
      message: 'Nova instância WhatsApp criada. Escaneie o QR Code para conectar.',
      data: {
        tenantId: tenantId,
        instanceName: instanceName,
        scenario: 'A - New Instance Created'
      }
    })

  } catch (error: any) {
    console.error("❌ ERRO na rota POST connect:", error.message)
    
    // Se o erro for de autenticação, retornar 401
    if (error.message?.includes('Token não fornecido') || error.message?.includes('Token inválido')) {
      return NextResponse.json(
        { 
          error: 'Token de autenticação inválido ou expirado',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined
        },
        { status: 401 }
      )
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
