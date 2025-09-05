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

// Autenticação centralizada em lib/auth

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
  // Autentica e valida tenant
  const user = authenticate(request, params.tenantId)

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
    
    // Gerar nome da instância baseado no businessName
    const instanceName = generateInstanceName(tenant.businessName, tenantId)
    
    console.log(`🏢 [DISCONNECT] Desconectando instância: "${instanceName}"`)
    console.log(`🏢 [DISCONNECT] Baseado em: "${tenant.businessName}" + "${tenantId}"`)
    

    // Verificar variáveis de ambiente da Evolution API
    const evolutionURL = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY

    if (!evolutionURL || !evolutionKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    // Deletar instância na Evolution API
    console.log(`🗑️  [API] Deletando instância WhatsApp: ${instanceName}`)
    
    const deleteUrl = `${evolutionURL}/instance/delete/${instanceName}`
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    })

    let deletionSuccessful = false
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ [API] Instância deletada na Evolution API:', data)
      deletionSuccessful = true
    } else {
      // Mesmo se houver erro na API, vamos limpar o banco
      console.warn(`⚠️  [API] Erro ao deletar instância (${response.status}), mas continuando com limpeza do banco`)
      deletionSuccessful = true // Forçar limpeza do banco
    }

    // Limpar o instanceName do banco
    if (deletionSuccessful) {
      try {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            whatsapp_instance_name: null 
          }
        })
        console.log(`✅ [API] Banco limpo - Tenant ${tenantId} desvinculado da instância WhatsApp`)
      } catch (dbError) {
        console.error('❌ [API] Erro ao limpar banco:', dbError)
        return NextResponse.json(
          { 
            error: 'Instância deletada na Evolution API, mas erro ao limpar banco de dados',
            details: process.env.NODE_ENV === 'development' ? dbError : undefined
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Instância WhatsApp desconectada com sucesso',
      data: {
        tenantId: tenantId,
        instanceName: instanceName,
        deletedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    const dev = process.env.NODE_ENV === 'development'
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('❌ [API] Erro ao desconectar WhatsApp:', error?.message || error)
    return NextResponse.json({ error: 'Erro interno do servidor ao desconectar WhatsApp', details: dev ? error?.message : undefined }, { status: 500 })
  }
}
