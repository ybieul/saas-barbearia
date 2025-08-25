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

// Check Evolution API instance status
export async function checkEvolutionApiStatus(): Promise<{
  isConnected: boolean
  instanceStatus?: string
  error?: string
}> {
  try {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      return {
        isConnected: false,
        error: 'Configurações da Evolution API não encontradas'
      }
    }

    console.log(`🔍 Verificando status da instância ${evolutionInstance}...`)

    const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        isConnected: false,
        error: `API Error: ${response.status} - ${errorText}`
      }
    }

    const instances = await response.json()
    console.log(`📋 Instâncias encontradas: ${instances?.length || 0}`)
    
    const currentInstance = instances.find((inst: any) => inst.instance.instanceName === evolutionInstance)
    
    if (!currentInstance) {
      return {
        isConnected: false,
        error: `Instância '${evolutionInstance}' não encontrada`
      }
    }
    
    console.log(`✅ Status da instância ${evolutionInstance}: ${currentInstance.instance.state}`)
    
    return {
      isConnected: true,
      instanceStatus: currentInstance.instance.state || 'unknown'
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status da Evolution API:', error)
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Real WhatsApp API call using Evolution API
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  try {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      console.error('❌ Configurações da Evolution API não encontradas nas variáveis de ambiente')
      console.log('Variáveis necessárias: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME')
      return false
    }

    console.log(`📱 Enviando mensagem WhatsApp via Evolution API para ${message.to}`)
    console.log(`🔗 URL: ${evolutionApiUrl}/message/sendText/${evolutionInstance}`)

    // Formato do payload para Evolution API
    const payload = {
      number: message.to,
      text: message.message
    }

    const response = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Evolution API Error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Mensagem WhatsApp enviada com sucesso via Evolution API')
    console.log('📋 Resposta da API:', result)
    
    return true

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp via Evolution API:', error)
    
    // Log detalhado para debug
    if (error instanceof Error) {
      console.error('📝 Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
      })
    }
    
    return false
  }
}

// Format phone number for WhatsApp API
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "")

  // Add country code if not present (assuming Brazil +55)
  if (cleaned.length === 11 && cleaned.startsWith("11")) {
    return `55${cleaned}`
  } else if (cleaned.length === 10) {
    return `5511${cleaned}`
  }

  return cleaned
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
