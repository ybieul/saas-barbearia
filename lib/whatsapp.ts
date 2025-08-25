// WhatsApp API integration utilities
import { formatCurrency } from './currency'

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
  upsell: (data: {
    clientName: string
    businessName: string
    additionalService: string
    discount: number
    customLink: string
  }) => string
}

// WhatsApp message templates
export const whatsappTemplates: WhatsAppTemplate = {
  confirmation: (data) => `🌟 *Agendamento Confirmado!*

Olá *${data.clientName}*! 😊

Seu agendamento na *${data.businessName}* foi confirmado com sucesso!

📅 *Detalhes do Agendamento:*
• Serviço: ${data.service}
• Profissional: ${data.professional}
• Data: ${data.date}
• Horário: ${data.time}
• Duração estimada: ${data.totalTime} minutos
• Valor: ${formatCurrency(data.price)}

✨ Estamos ansiosos para recebê-lo(a)!

_Você receberá lembretes automáticos antes do seu horário._

Obrigado pela preferência! 🙏`,

  reminder24h: (data) => `⏰ *Lembrete de Agendamento*

Olá *${data.clientName}*! 

Lembrando que você tem um agendamento amanhã na *${data.businessName}*:

📅 *Detalhes:*
• Serviço: ${data.service}
• Profissional: ${data.professional}
• Data: ${data.date}
• Horário: ${data.time}

Nos vemos em breve! ✨

_Caso precise remarcar, entre em contato conosco._`,

  reminder2h: (data) => `🔔 *Seu horário é daqui a pouco!*

Olá *${data.clientName}*!

Seu agendamento na *${data.businessName}* é em *2 horas*:

⏰ Horário: ${data.time}
👨‍💼 Profissional: ${data.professional}
✂️ Serviço: ${data.service}

Já estamos te esperando! 😊`,

  reactivation: (data) => `🌟 *Sentimos sua falta!*

Olá *${data.clientName}*! 😊

Notamos que você não nos visita há um tempo na *${data.businessName}*!

Como você é um cliente especial, preparamos uma oferta exclusiva:

🎁 *20% de desconto* no seu próximo *${data.preferredService}*

📅 Agende já: ${data.customLink}
⏰ Oferta válida até o final do mês!

Estamos ansiosos para te receber novamente! ✨`,

  upsell: (data) => `💡 *Que tal complementar seu visual?*

Olá *${data.clientName}*!

Vimos que você agendou conosco na *${data.businessName}*! 

Que tal adicionar um *${data.additionalService}* com *${data.discount}% de desconto*?

🔗 Atualize seu agendamento: ${data.customLink}

Deixe seu visual ainda mais incrível! ✨`,
}

// Evolution API integration (Client-side version)
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  try {
    console.log(`📤 [Client] Enviando mensagem WhatsApp via API Route...`)
    console.log(`📱 Para: ${message.to}`)
    console.log(`📝 Tipo: ${message.type}`)

    // Obter token do localStorage
    const token = localStorage.getItem('auth_token')
    console.log('🔍 [Client] Token encontrado:', token ? '✅ Sim' : '❌ Não')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: message.to,
        message: message.message,
        type: message.type
      })
    })

    const responseData = await response.json()

    if (response.ok && responseData.success) {
      console.log('✅ [Client] Mensagem enviada com sucesso!')
      console.log('📋 [Client] Resposta:', responseData)
      return true
    } else {
      console.error('❌ [Client] Falha ao enviar mensagem')
      console.error('📋 Status:', response.status)
      console.error('📋 Resposta:', responseData)
      return false
    }

  } catch (error) {
    console.error('❌ [Client] Erro ao conectar com API:', error)
    return false
  }
}

// Format phone number for WhatsApp API (Brazilian format)
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "")
  
  console.log(`📞 Formatando número: "${phone}" -> "${cleaned}"`)

  // Brazilian phone number patterns
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // Already in international format: 5511999999999
    console.log(`✅ Número já no formato internacional: ${cleaned}`)
    return cleaned
  } else if (cleaned.length === 11) {
    // Brazilian format with area code: 11999999999
    const formatted = `55${cleaned}`
    console.log(`✅ Adicionado código do país: ${formatted}`)
    return formatted
  } else if (cleaned.length === 10) {
    // Old Brazilian format without 9: 1199999999
    const formatted = `5511${cleaned.substring(2)}`
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

// Check Evolution API instance status (Client-side version)
export async function checkWhatsAppStatus(): Promise<{
  connected: boolean
  instanceName: string | null
  error?: string
}> {
  try {
    console.log('🔍 [Client] Verificando status via API Route...')
    
    const response = await fetch('/api/whatsapp/status', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('📋 [Client] Status recebido:', data)
      return data
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      console.error('❌ [Client] Erro ao verificar status:', errorData)
      
      return {
        connected: false,
        instanceName: null,
        error: `HTTP ${response.status}: ${errorData.message || 'Erro na API'}`
      }
    }

  } catch (error) {
    console.error('❌ [Client] Erro ao conectar com API:', error)
    return {
      connected: false,
      instanceName: null,
      error: error instanceof Error ? error.message : 'Erro de conexão'
    }
  }
}

// Schedule WhatsApp reminders
export function scheduleReminders(appointmentData: {
  clientName: string
  clientPhone: string
  businessName: string
  service: string
  professional: string
  date: string
  time: string
  appointmentDateTime: Date
}) {
  const now = new Date()
  const appointmentTime = appointmentData.appointmentDateTime

  // Calculate reminder times
  const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000)
  const reminder2h = new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000)

  // Schedule 24-hour reminder
  if (reminder24h > now) {
    const delay24h = reminder24h.getTime() - now.getTime()
    setTimeout(async () => {
      const message = whatsappTemplates.reminder24h(appointmentData)
      await sendWhatsAppMessage({
        to: formatPhoneNumber(appointmentData.clientPhone),
        message,
        type: "reminder",
      })
    }, delay24h)
  }

  // Schedule 2-hour reminder
  if (reminder2h > now) {
    const delay2h = reminder2h.getTime() - now.getTime()
    setTimeout(async () => {
      const message = whatsappTemplates.reminder2h(appointmentData)
      await sendWhatsAppMessage({
        to: formatPhoneNumber(appointmentData.clientPhone),
        message,
        type: "reminder",
      })
    }, delay2h)
  }
}
