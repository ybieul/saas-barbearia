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

// Simulate WhatsApp API call
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  try {
    // In a real implementation, this would call the WhatsApp Business API
    // For now, we'll simulate the API call
    if (process.env.NODE_ENV === 'development') {
    console.log("Sending WhatsApp message:", message)
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1

    if (success) {
      if (process.env.NODE_ENV === 'development') {
      console.log("WhatsApp message sent successfully")
      }
      return true
    } else {
      throw new Error("Failed to send WhatsApp message")
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error)
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
