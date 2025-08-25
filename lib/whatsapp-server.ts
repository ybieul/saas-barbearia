// WhatsApp API integration utilities - SERVER SIDE VERSION
import { formatCurrency } from './currency.js'

export interface WhatsAppMessage {
  to: string
  message: string
  type: "confirmation" | "reminder" | "reactivation" | "custom"
}

export interface WhatsAppTemplate {
  confirmation: (data: {
    clientName: string
    businessName: string
    service: string
    professional: string
    date: string
    time: string
    totalTime: number
    price: number
  }) => string
  reminder24h: (data: {
    clientName: string
    businessName: string
    service: string
    professional: string
    date: string
    time: string
  }) => string
  reminder12h: (data: {
    clientName: string
    businessName: string
    service: string
    professional: string
    date: string
    time: string
  }) => string
  reminder2h: (data: {
    clientName: string
    businessName: string
    service: string
    professional: string
    time: string
  }) => string
  reactivation: (data: {
    clientName: string
    businessName: string
    preferredService: string
    customLink: string
  }) => string
}

// Server-side WhatsApp templates
export const whatsappTemplates: WhatsAppTemplate = {
  confirmation: (data) => `✅ *Agendamento Confirmado!*

Olá *${data.clientName}*! 😊

Seu agendamento na *${data.businessName}* foi confirmado com sucesso!

📋 *Detalhes:*
🔹 Serviço: ${data.service}
👨‍💼 Profissional: ${data.professional}
📅 Data: ${data.date}
⏰ Horário: ${data.time}
⏳ Duração: ${data.totalTime} min
💰 Valor: ${formatCurrency(data.price)}

💡 *Lembre-se:*
• Chegue 10 min antes do horário
• Em caso de cancelamento, avise com 24h de antecedência

Nos vemos em breve! 🎉`,

  reminder24h: (data) => `🔔 *Lembrete: Agendamento Amanhã!*

Olá *${data.clientName}*! 😊

Este é um lembrete do seu agendamento na *${data.businessName}*:

📅 *Amanhã - ${data.date}*
⏰ Horário: ${data.time}
🔹 Serviço: ${data.service}
👨‍💼 Profissional: ${data.professional}

💡 Lembre-se de chegar 10 minutos antes!

Qualquer imprevisto, entre em contato conosco! 📱`,

  reminder12h: (data) => `⏰ *Lembrete: Seu horário é hoje!*

Olá *${data.clientName}*!

Seu agendamento na *${data.businessName}* é hoje:

📅 *Hoje - ${data.date}*
⏰ Horário: ${data.time}  
🔹 Serviço: ${data.service}
👨‍💼 Profissional: ${data.professional}

Estamos te esperando! 😊`,

  reminder2h: (data) => `⚡ *Lembrete: Seu horário é em 2 horas!*

Olá *${data.clientName}*!

Não esqueça do seu agendamento:

⏰ *${data.time}* (em 2 horas)
🔹 Serviço: ${data.service}  
👨‍💼 Profissional: ${data.professional}

Já estamos nos preparando para te receber! 🎯`,

  reactivation: (data) => `🌟 *Sentimos sua falta!*

Olá *${data.clientName}*! 😊

Notamos que você não nos visita há um tempo na *${data.businessName}*!

Como você é um cliente especial, preparamos uma oferta exclusiva:

🎁 *20% de desconto* no seu próximo *${data.preferredService}*

📅 Agende já: ${data.customLink}
⏰ Oferta válida até o final do mês!

Estamos ansiosos para te receber novamente! ✨`,
}

// Format phone number to Brazilian standard
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ""
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  console.log(`📱 Formatando telefone: ${phone} -> ${cleaned}`)
  
  // Handle different Brazilian phone number formats
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // Full format with country code: 5511999999999
    const formatted = cleaned
    console.log(`✅ Formato completo: ${formatted}`)
    return formatted
  } else if (cleaned.length === 11 && cleaned.startsWith('11')) {
    // With area code but without country: 11999999999
    const formatted = `55${cleaned}`
    console.log(`✅ Adicionado código do país: ${formatted}`)
    return formatted
  } else if (cleaned.length === 10) {
    // Old format without 9th digit: 1199999999
    const areaCode = cleaned.substring(0, 2)
    const number = cleaned.substring(2)
    const formatted = `55${areaCode}9${number}`
    console.log(`✅ Formato antigo convertido: ${formatted}`)
    return formatted
  } else if (cleaned.length === 9) {
    // Only the number without area code: 999999999
    const formatted = `5511${cleaned}`
    console.log(`✅ Adicionado DDD 11: ${formatted}`)
    return formatted
  }

  // Return as is if doesn't match common Brazilian patterns
  console.log(`⚠️ Formato não reconhecido, retornando como está: ${cleaned}`)
  return cleaned
}

// Server-side Evolution API integration (direct HTTP calls)
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  try {
    console.log(`📤 [Server] Enviando mensagem WhatsApp diretamente para Evolution API...`)
    console.log(`📱 Para: ${message.to}`)
    console.log(`📝 Tipo: ${message.type}`)
    console.log(`🔍 [Server] Usando instância: ${process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE}`)

    // Evolution API configuration from environment
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      console.error('❌ [Server] Configuração Evolution API incompleta')
      console.error('🔍 [Server] Debug Environment Variables:', {
        EVOLUTION_API_URL: EVOLUTION_API_URL ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_API_KEY: EVOLUTION_API_KEY ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_INSTANCE: EVOLUTION_INSTANCE ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME ? '✅ Definida' : '❌ Não definida'
      })
      return false
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(message.to)
    
    const payload = {
      number: formattedPhone,
      text: message.message
    }

    console.log('📡 [Server] Payload:', payload)

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    })

    console.log('📋 [Server] Response status:', response.status)

    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ [Server] Mensagem enviada com sucesso:', responseData)
      return true
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      console.error('❌ [Server] Erro ao enviar mensagem:', response.status, errorData)
      return false
    }

  } catch (error) {
    console.error('❌ [Server] Erro ao conectar com Evolution API:', error)
    return false
  }
}

// Check Evolution API status (server-side)
export async function checkWhatsAppStatus(): Promise<{
  connected: boolean
  instanceName: string | null
  error?: string
}> {
  try {
    console.log('🔍 [Server] Verificando status Evolution API...')
    
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      console.error('❌ [Server] Configuração Evolution API incompleta para status check')
      console.error('🔍 [Server] Debug Environment Variables:', {
        EVOLUTION_API_URL: EVOLUTION_API_URL ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_API_KEY: EVOLUTION_API_KEY ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_INSTANCE: EVOLUTION_INSTANCE ? '✅ Definida' : '❌ Não definida',
        EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME ? '✅ Definida' : '❌ Não definida'
      })
      return {
        connected: false,
        instanceName: null,
        error: 'Configuração Evolution API incompleta'
      }
    }

    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('📋 [Server] Status recebido:', data)
      
      return {
        connected: data.state === 'open',
        instanceName: EVOLUTION_INSTANCE,
        error: data.state !== 'open' ? `Estado: ${data.state}` : undefined
      }
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      console.error('❌ [Server] Erro ao verificar status:', errorData)
      
      return {
        connected: false,
        instanceName: null,
        error: `HTTP ${response.status}: ${errorData.message || 'Erro na API'}`
      }
    }

  } catch (error) {
    console.error('❌ [Server] Erro ao conectar com Evolution API:', error)
    return {
      connected: false,
      instanceName: null,
      error: error instanceof Error ? error.message : 'Erro de conexão'
    }
  }
}
