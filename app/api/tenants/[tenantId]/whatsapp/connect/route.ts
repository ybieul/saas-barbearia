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
    console.log("6. Iniciando verificação de token...")
    const user = verifyToken(request)
    console.log("7. ✅ Token verificado com sucesso")
    
    if (!user) {
      console.log("❌ ERRO: Usuário não encontrado após verificação")
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log("8. Verificando permissão para tenant...")
    console.log("8.1. Tenant ID da URL:", params.tenantId)
    console.log("8.2. Tenant ID do token:", user.tenantId)

    // Verificar se o tenantId corresponde ao usuário logado
    if (user.tenantId !== params.tenantId) {
      console.log("❌ ERRO 403: Permissão negada - IDs não correspondem")
      return NextResponse.json(
        { error: 'Sem permissão para acessar este tenant' },
        { status: 403 }
      )
    }
    
    console.log("9. ✅ Permissão verificada - usuário autorizado")
    console.log("--- VERIFICAÇÃO DE PERMISSÃO BEM-SUCEDIDA ---")

    const { tenantId } = params

    // Verificar se o usuário tem permissão para gerenciar este tenant
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

    console.log(`🏢 [API] Estabelecimento encontrado: "${tenant.businessName}" (${tenantId})`)

    // Verificar se já tem uma instância conectada
    // NOTA: Esta verificação será habilitada após a migração do banco
    // if (tenant.whatsapp_instance_name) {
    //   return NextResponse.json(
    //     { error: 'Este tenant já possui uma instância WhatsApp conectada' },
    //     { status: 400 }
    //   )
    // }

    // 2. Geração do Nome da Instância baseado no nome do estabelecimento
    const instanceName = generateInstanceName(tenant.businessName, tenantId)
    
    console.log(`🏷️ [API] Nome da instância gerado: "${instanceName}"`)
    console.log(`🏢 [API] Baseado em: "${tenant.businessName}" + "${tenantId}"`)
    

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

    // 4. NOVA LÓGICA: Verificar se instância já existe (tornar idempotente)
    console.log(`🔍 [API] Verificando se instância já existe: ${instanceName}`)
    
    try {
      const statusCheck = await checkInstanceStatus(evolutionURL, evolutionKey, instanceName)
      
      if (statusCheck.exists) {
        console.log(`📋 [API] Instância encontrada com estado: ${statusCheck.state}`)
        
        if (statusCheck.state === 'open') {
          // Já está conectada - retornar sucesso sem fazer nada
          console.log('✅ [API] WhatsApp já está conectado - não precisa gerar novo QR Code')
          return NextResponse.json({
            success: true,
            alreadyConnected: true,
            instanceName: instanceName,
            message: 'WhatsApp já está conectado com sucesso!',
            data: {
              tenantId: tenantId,
              instanceName: instanceName,
              status: statusCheck.state,
              connectedAt: new Date().toISOString()
            }
          })
        } else {
          // Existe mas não está conectada - limpar instância antiga
          console.log(`🧹 [API] Instância existe mas não conectada (${statusCheck.state}) - limpando...`)
          
          const deleted = await deleteInstance(evolutionURL, evolutionKey, instanceName)
          
          if (deleted) {
            console.log('🗑️ [API] Instância antiga deletada com sucesso')
          } else {
            console.warn('⚠️ [API] Erro ao deletar instância antiga (continuando)')
          }
          
          // Aguardar um pouco para a Evolution API processar a deleção
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } else {
        // Instância não existe - isso é o esperado para primeira conexão
        console.log('📋 [API] Instância não existe ainda - prosseguindo com criação')
      }
    } catch (statusError) {
      // Erro de rede/timeout ao verificar - continuar com criação
      console.warn('⚠️ [API] Erro ao verificar status da instância (continuando):', statusError)
    }

    // 5. Criar nova instância (só chega aqui se necessário)
    console.log(`🔄 [API] Criando nova instância WhatsApp para tenant: ${tenantId}`)
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
      console.error(`❌ [API] Evolution API retornou erro: ${response.status}`)
      
      let errorText = 'Erro desconhecido'
      try {
        errorText = await response.text()
        console.error('❌ [API] Detalhes do erro:', errorText)
      } catch (e) {
        console.error('❌ [API] Não foi possível ler detalhes do erro')
      }
      
      // Para a rota de connect, erros da Evolution API são sempre problemas reais
      return NextResponse.json(
        { 
          error: `Erro ao criar instância WhatsApp na Evolution API`,
          details: process.env.NODE_ENV === 'development' ? 
            `Status: ${response.status}, Detalhes: ${errorText}` : 
            `Erro ${response.status} na Evolution API`
        },
        { status: 500 }
      )
    }

    // 6. Processar resposta da Evolution API
    const evolutionResponse = await response.json()
    console.log('✅ [API] Instância criada com sucesso:', evolutionResponse)

    // 7. NOTA: Não salvar no banco ainda - apenas após confirmação da conexão via status
    console.log(`✅ [API] Instância criada - Aguardando conexão do usuário para salvar no banco`)

    // 8. Verificar se a resposta contém QR Code
    let qrCodeData = null
    
    if (evolutionResponse.qrcode?.base64) {
      qrCodeData = evolutionResponse.qrcode.base64
    } else if (evolutionResponse.instance?.qrcode?.base64) {
      qrCodeData = evolutionResponse.instance.qrcode.base64
    } else if (evolutionResponse.base64) {
      qrCodeData = evolutionResponse.base64
    }

    // 9. Retornar dados para o frontend
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
    console.error("❌ ERRO GERAL na rota POST connect:")
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
    console.error('❌ [API] Erro ao conectar WhatsApp:', error)
    
    // Em caso de erro, tentar remover o instance_name do banco
    try {
      await prisma.tenant.update({
        where: { id: params.tenantId },
        data: { whatsapp_instance_name: null }
      })
      console.log('✅ [API] Banco limpo após erro')
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
