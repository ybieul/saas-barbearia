// Função multi-tenant para envio de mensagens WhatsApp
import { formatPhoneNumber } from './whatsapp-server'

export interface MultiTenantWhatsAppMessage {
  to: string
  message: string
  instanceName: string
  type: "confirmation" | "reminder" | "reactivation" | "test" | "custom"
}

/**
 * Envia mensagem WhatsApp usando instância específica do tenant
 * @param messageData - Dados da mensagem com instância específica
 * @returns Promise<boolean> - true se enviada com sucesso
 */
export async function sendMultiTenantWhatsAppMessage(messageData: MultiTenantWhatsAppMessage): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 [MULTI-TENANT] Enviando mensagem WhatsApp...`)
      console.log(`📱 Para: ${messageData.to}`)
      console.log(`🏢 Instância: ${messageData.instanceName}`)
      console.log(`📝 Tipo: ${messageData.type}`)
    }

    // Evolution API configuration from environment
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [MULTI-TENANT] URLs configuradas:`)
      console.log(`📡 EVOLUTION_API_URL: ${EVOLUTION_API_URL}`)
      console.log(`🔑 EVOLUTION_API_KEY: ${EVOLUTION_API_KEY ? 'Definida' : 'Não definida'}`)
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [MULTI-TENANT] Configuração Evolution API incompleta')
        console.error('🔍 [MULTI-TENANT] Debug Environment Variables:', {
          EVOLUTION_API_URL: EVOLUTION_API_URL ? '✅ Definida' : '❌ Não definida',
          EVOLUTION_API_KEY: EVOLUTION_API_KEY ? '✅ Definida' : '❌ Não definida',
        })
      }
      return false
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(messageData.to)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [MULTI-TENANT] Telefone formatado: ${messageData.to} -> ${formattedPhone}`)
    }
    
    const payload = {
      number: formattedPhone,
      text: messageData.message,
      delay: 1000
    }

    const fullUrl = `${EVOLUTION_API_URL}/message/sendText/${messageData.instanceName}`

    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 [MULTI-TENANT] Tentando conectar à Evolution API:`, {
        url: fullUrl,
        instanceName: messageData.instanceName,
        method: 'POST',
        headers: { 'apikey': EVOLUTION_API_KEY ? 'PRESENTE' : 'AUSENTE' }
      })
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(payload),
      // Timeout de 15 segundos
      signal: AbortSignal.timeout(15000)
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 [MULTI-TENANT] Evolution API response status: ${response.status}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [MULTI-TENANT] Evolution API error:`, errorText)
      }
      return false
    }

    const result = await response.json()
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [MULTI-TENANT] Mensagem enviada via Evolution API:`, result)
    }

    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [MULTI-TENANT] Erro ao enviar mensagem WhatsApp:', error)
    }
    return false
  }
}
