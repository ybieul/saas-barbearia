import { NextRequest, NextResponse } from 'next/server'
import { formatPhoneNumber } from '@/lib/whatsapp'
import { sendMultiTenantWhatsAppMessage } from '@/lib/whatsapp-multi-tenant'
import { getTenantWhatsAppConfig } from '@/lib/whatsapp-tenant-helper'

interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

import { verifyToken, AuthError } from '@/lib/auth'

// 🚀 POST MULTI-TENANT - Enviar mensagem de teste
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação JWT
  const user = verifyToken(req)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [TEST-MESSAGE] Usuário autenticado:', user.email)
      console.log('🏢 [TEST-MESSAGE] TenantId:', user.tenantId)
    }

    // Obter dados da requisição
    const { to, message, type = 'test' } = await req.json()

    if (!to || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Número e mensagem são obrigatórios' 
      }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 [TEST-MESSAGE] Iniciando envio de mensagem de teste...`)
      console.log(`📱 Para: ${to}`)
      console.log(`📝 Mensagem: ${message.substring(0, 50)}...`)
    }

    // ✅ VERIFICAÇÃO MULTI-TENANT: Buscar configuração WhatsApp do tenant
    const tenantConfig = await getTenantWhatsAppConfig(user.tenantId)
    
    if (!tenantConfig || !tenantConfig.instanceName) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`❌ [TEST-MESSAGE] Tenant ${user.tenantId} não possui instância WhatsApp configurada`)
      }
      
      return NextResponse.json({
        success: false,
        error: 'Por favor, conecte seu número de WhatsApp primeiro. Acesse a seção "Configurações > WhatsApp" para conectar.',
        code: 'WHATSAPP_NOT_CONNECTED'
      }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [TEST-MESSAGE] Instância WhatsApp encontrada: ${tenantConfig.instanceName}`)
      console.log(`🏢 [TEST-MESSAGE] Empresa: ${tenantConfig.businessName}`)
    }

    // 🎯 ENVIAR MENSAGEM USANDO INSTÂNCIA ESPECÍFICA DO TENANT
    const success = await sendMultiTenantWhatsAppMessage({
      to,
      message,
      instanceName: tenantConfig.instanceName,
      type: 'test'
    })

    if (success) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [TEST-MESSAGE] Mensagem de teste enviada com sucesso via instância: ${tenantConfig.instanceName}`)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Mensagem de teste enviada com sucesso!',
        data: {
          instanceName: tenantConfig.instanceName,
          businessName: tenantConfig.businessName,
          to: formatPhoneNumber(to)
        }
      })
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [TEST-MESSAGE] Falha ao enviar mensagem de teste`)
      }
      
      return NextResponse.json({
        success: false,
        error: 'Falha ao enviar mensagem. Verifique se o WhatsApp está conectado e tente novamente.',
        code: 'SEND_FAILED'
      }, { status: 500 })
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [TEST-MESSAGE] Erro ao processar requisição:', error)
    }
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: 'AUTH_ERROR'
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
