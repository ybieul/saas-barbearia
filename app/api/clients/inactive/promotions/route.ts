import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { replaceTemplatePlaceholders } from '@/lib/template-helpers'
import { sendMultiTenantWhatsAppMessage } from '@/lib/whatsapp-multi-tenant'
import { getTenantWhatsAppConfig } from '@/lib/whatsapp-tenant-helper'

// 🚀 POST MULTI-TENANT - Enviar promoção para clientes inativos
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { clientIds, templateId, message } = await request.json()

    console.log(`🎯 [PROMOTIONS] Iniciando envio de promoções multi-tenant...`)
    console.log(`🏢 [PROMOTIONS] TenantId: ${user.tenantId}`)
    console.log(`👥 [PROMOTIONS] Clientes selecionados: ${clientIds?.length || 0}`)

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { message: 'Lista de clientes é obrigatória' },
        { status: 400 }
      )
    }

    if (!templateId && !message) {
      return NextResponse.json(
        { message: 'Template ou mensagem é obrigatório' },
        { status: 400 }
      )
    }

    // ✅ VERIFICAÇÃO MULTI-TENANT 1: Buscar configuração WhatsApp do tenant
    const tenantConfig = await getTenantWhatsAppConfig(user.tenantId)
    
    if (!tenantConfig || !tenantConfig.instanceName) {
      console.log(`❌ [PROMOTIONS] Tenant ${user.tenantId} não possui instância WhatsApp configurada`)
      
      return NextResponse.json({
        success: false,
        message: 'Por favor, conecte seu número de WhatsApp primeiro. Acesse a seção "Configurações > WhatsApp" para conectar.',
        code: 'WHATSAPP_NOT_CONNECTED'
      }, { status: 400 })
    }

    console.log(`✅ [PROMOTIONS] Instância WhatsApp encontrada: ${tenantConfig.instanceName}`)

  // ❌ Removido: verificação de automação de reativação (sempre permitido após usuário acionar manualmente)

    // Verificar se todos os clientes pertencem ao tenant
    const clients = await prisma.endUser.findMany({
      where: {
        id: { in: clientIds },
        tenantId: user.tenantId
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    })

    if (clients.length !== clientIds.length) {
      return NextResponse.json(
        { message: 'Alguns clientes não foram encontrados' },
        { status: 400 }
      )
    }

    console.log(`✅ [PROMOTIONS] ${clients.length} clientes validados`)

    // Buscar dados do business para obter customLink
    const business = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { businessConfig: true, businessName: true }
    })

    // Extrair customLink do businessConfig JSON
    const businessConfig = business?.businessConfig as any
    const customLink = businessConfig?.customLink || 'sua-barbearia'

    console.log(`🔗 [PROMOTIONS] Custom Link: ${customLink}`)
    console.log(`🏢 [PROMOTIONS] Empresa: ${tenantConfig.businessName}`)
    
    // 🎯 ENVIAR MENSAGENS USANDO INSTÂNCIA ESPECÍFICA DO TENANT
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const client of clients) {
      try {
        console.log(`📤 [PROMOTIONS] Enviando para cliente: ${client.name} (${client.phone})`)
        
        // Verificar se cliente tem telefone
        if (!client.phone) {
          console.log(`⚠️ [PROMOTIONS] Cliente ${client.name} não possui telefone cadastrado`)
          errorCount++
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: false,
            error: 'Telefone não cadastrado'
          })
          continue
        }
        
        // 🎯 PERSONALIZAR MENSAGEM PARA CADA CLIENTE
        const personalizedMessage = replaceTemplatePlaceholders(message, client.name, customLink)
        
        // Enviar usando instância específica do tenant
        const success = await sendMultiTenantWhatsAppMessage({
          to: client.phone,
          message: personalizedMessage,
          instanceName: tenantConfig.instanceName,
          type: 'reactivation'
        })

        if (success) {
          successCount++
          console.log(`✅ [PROMOTIONS] Mensagem enviada para ${client.name} via instância ${tenantConfig.instanceName}`)
          
          // Registrar sucesso no banco
          await prisma.whatsAppLog.create({
            data: {
              tenantId: user.tenantId,
              to: client.phone,
              type: 'PROMOTION',
              message: personalizedMessage,
              status: 'SENT',
              sentAt: new Date()
            }
          })
          
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: true,
            instanceName: tenantConfig.instanceName,
            personalizedMessage: personalizedMessage
          })
        } else {
          errorCount++
          console.error(`❌ [PROMOTIONS] Falha ao enviar mensagem para ${client.name}`)
          
          // Registrar erro no banco
          await prisma.whatsAppLog.create({
            data: {
              tenantId: user.tenantId,
              to: client.phone,
              type: 'PROMOTION',
              message: personalizedMessage,
              status: 'FAILED',
              sentAt: new Date()
            }
          })
          
          results.push({
            clientId: client.id,
            clientName: client.name,
            success: false,
            error: 'Falha no envio via Evolution API',
            personalizedMessage: personalizedMessage
          })
        }

        // Delay entre envios para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        errorCount++
        console.error(`❌ [PROMOTIONS] Erro ao processar cliente ${client.name}:`, error)
        
        results.push({
          clientId: client.id,
          clientName: client.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    console.log(`📊 [PROMOTIONS] Resultado final:`)
    console.log(`✅ Sucessos: ${successCount}`)
    console.log(`❌ Erros: ${errorCount}`)
    console.log(`🏢 Instância usada: ${tenantConfig.instanceName}`)

    return NextResponse.json({
      success: true,
      message: `Promoção enviada! ${successCount} sucessos, ${errorCount} erros`,
      data: {
        successCount,
        errorCount,
        totalClients: clients.length,
        instanceName: tenantConfig.instanceName,
        businessName: tenantConfig.businessName,
        results
      }
    })

  } catch (error) {
    console.error('❌ [PROMOTIONS] Erro ao processar requisição:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}