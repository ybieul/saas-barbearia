import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate, AuthError } from '@/lib/auth'

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

// Autenticação centralizada removendo duplicação de verifyToken

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log("=== ROTA GET STATUS INICIADA ===")
    }
    
    // Autentica e garante acesso ao tenant
    const user = authenticate(request, params.tenantId)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [STATUS] Autenticação e autorização concluídas para usuário', user.userId)
    }

    const { tenantId } = params
    
    // Buscar dados do tenant para gerar nome da instância correto
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
    
    // Obter instanceName do query param ou gerar baseado no businessName
    const url = new URL(request.url)
    const queryInstanceName = url.searchParams.get('instanceName')
    const instanceName = queryInstanceName || generateInstanceName(tenant.businessName, tenantId)
    
    console.log(`🏢 [STATUS] Verificando instância: "${instanceName}"`)
    console.log(`🏢 [STATUS] Baseado em: "${tenant.businessName}" + "${tenantId}"`)
    

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

    // Tratar diferentes códigos de status HTTP
    if (!response.ok) {
      console.log(`⚠️ [API] Evolution API retornou status: ${response.status}`)
      
      // 404 significa que a instância não existe ou está desconectada - isso é VÁLIDO
      if (response.status === 404) {
        console.log('📴 [API] Instância não encontrada (404) - interpretando como desconectada')
        return NextResponse.json({
          connected: false,
          instanceName: instanceName,
          status: 'close',
          error: 'Instância não encontrada - WhatsApp desconectado',
          data: {
            tenantId: tenantId,
            instanceName: instanceName,
            lastCheck: new Date().toISOString()
          }
        })
      }
      
      // Para outros erros (500, 401, etc.), retornar erro real
      console.error(`❌ [API] Erro inesperado na Evolution API: ${response.status}`)
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      return NextResponse.json(
        { 
          connected: false,
          instanceName: instanceName,
          error: `Erro na Evolution API: ${response.status} - ${errorText}`
        },
        { status: 500 }
      )
    }

    // Se chegou aqui, a resposta foi bem-sucedida (200)
    const data = await response.json()
    console.log('📋 [API] Status da instância obtido com sucesso:', data)
    
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
    const dev = process.env.NODE_ENV === 'development'
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('❌ [STATUS] Erro geral:', error?.message || error)
    // Timeout ou falha de rede: considerar desconectado
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout') || error?.message?.includes('fetch')) {
      let fallbackInstanceName = `tenant_${params.tenantId}`
      try {
        const fallbackTenant = await prisma.tenant.findFirst({ where: { id: params.tenantId }, select: { businessName: true } })
        if (fallbackTenant) {
          fallbackInstanceName = generateInstanceName(fallbackTenant.businessName, params.tenantId)
        }
      } catch {}
      return NextResponse.json({
        connected: false,
        instanceName: fallbackInstanceName,
        status: 'close',
        error: 'Timeout na comunicação com Evolution API - interpretado como desconectado',
        data: { tenantId: params.tenantId, instanceName: fallbackInstanceName, lastCheck: new Date().toISOString() }
      })
    }
    return NextResponse.json({ connected: false, error: 'Erro interno ao verificar status da conexão WhatsApp', details: dev ? error?.message : undefined }, { status: 500 })
  }
}
