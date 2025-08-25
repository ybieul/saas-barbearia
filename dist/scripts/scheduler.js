// Scheduler for WhatsApp reminders - Standalone CRON job
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Import timezone functions (converted to CommonJS)
function getBrazilNow() {
  const now = new Date()
  // Ajustar para timezone brasileiro (-3 UTC)
  const brazilOffset = -3 * 60 // -180 minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (brazilOffset * 60000))
}

function formatBrazilDate(date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatBrazilTime(date) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function generateId() {
  return require('crypto').randomBytes(12).toString('base64url')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// WhatsApp templates (CommonJS version)
const whatsappTemplates = {
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

Já estamos nos preparando para te receber! 🎯`
}

// Phone formatting
function formatPhoneNumber(phone) {
  if (!phone) return ""
  
  const cleaned = phone.replace(/\D/g, '')
  console.log(`📱 Formatando telefone: ${phone} -> ${cleaned}`)
  
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned
  } else if (cleaned.length === 11 && cleaned.startsWith('11')) {
    return `55${cleaned}`
  } else if (cleaned.length === 10) {
    const areaCode = cleaned.substring(0, 2)
    const number = cleaned.substring(2)
    return `55${areaCode}9${number}`
  } else if (cleaned.length === 9) {
    return `5511${cleaned}`
  }
  
  return cleaned
}

// Evolution API call
async function sendWhatsAppMessage(message) {
  try {
    console.log(`📤 [CRON] Enviando mensagem WhatsApp...`)
    console.log(`📱 Para: ${message.to}`)
    console.log(`📝 Tipo: ${message.type}`)

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      console.error('❌ [CRON] Configuração Evolution API incompleta')
      return false
    }

    const formattedPhone = formatPhoneNumber(message.to)
    
    const payload = {
      number: formattedPhone,
      text: message.message
    }

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    })

    console.log('📋 [CRON] Response status:', response.status)

    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ [CRON] Mensagem enviada com sucesso')
      return true
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      console.error('❌ [CRON] Erro ao enviar mensagem:', response.status, errorData)
      return false
    }

  } catch (error) {
    console.error('❌ [CRON] Erro ao conectar com Evolution API:', error)
    return false
  }
}

// Reminder configurations
const REMINDER_CONFIGS = [
  {
    type: 'reminder_24h',
    hoursBefore: 24,
    minutesBefore: 0,
    template: 'reminder24h'
  },
  {
    type: 'reminder_12h',
    hoursBefore: 12,
    minutesBefore: 0,
    template: 'reminder12h'
  },
  {
    type: 'reminder_2h',
    hoursBefore: 2,
    minutesBefore: 0,
    template: 'reminder2h'
  }
]

// Main reminder processing function
async function sendWhatsappReminders() {
  console.log('🚀 [CRON] Iniciando processamento de lembretes...')
  console.log(`[${new Date().toISOString()}] CRON JOB EXECUTADO`)
  
  const now = getBrazilNow()
  let totalSent = 0

  for (const config of REMINDER_CONFIGS) {
    try {
      console.log(`📋 [CRON] Processando ${config.type}...`)
      
      // Calcular janela de tempo
      const exactTime = new Date(now)
      exactTime.setHours(exactTime.getHours() + config.hoursBefore, config.minutesBefore, 0, 0)
      
      // Janela de 10 minutos para capturar agendamentos
      const windowStart = new Date(exactTime)
      windowStart.setMinutes(windowStart.getMinutes() - 5)
      
      const windowEnd = new Date(exactTime)
      windowEnd.setMinutes(windowEnd.getMinutes() + 5)

      console.log(`🔍 [CRON] Buscando agendamentos entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`)

      // Buscar agendamentos
      const appointments = await prisma.appointment.findMany({
        where: {
          dateTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        },
        include: {
          tenant: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true,
            }
          },
          endUser: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          professional: {
            select: {
              id: true,
              name: true,
            }
          },
          services: {
            select: {
              id: true,
              name: true,
              price: true,
              duration: true,
            }
          }
        }
      })

      console.log(`📋 [CRON] Encontrados ${appointments.length} agendamentos no período`)

      // Filtrar e enviar lembretes
      for (const appointment of appointments) {
        try {
          // Verificar se automação está ativa
          const automationSetting = await prisma.$queryRaw`
            SELECT * FROM automation_settings 
            WHERE establishmentId = ${appointment.tenantId} 
            AND automationType = ${config.type} 
            AND isEnabled = true
            LIMIT 1
          `
          
          if (automationSetting.length === 0) {
            console.log(`⚠️ [CRON] Automação ${config.type} desabilitada para ${appointment.tenant.businessName}`)
            continue
          }

          // Verificar se já foi enviado
          const existingReminder = await prisma.$queryRaw`
            SELECT * FROM appointment_reminders 
            WHERE appointmentId = ${appointment.id} 
            AND reminderType = ${config.type}
            LIMIT 1
          `
          
          if (existingReminder.length > 0) {
            console.log(`✅ [CRON] Lembrete ${config.type} já enviado para agendamento ${appointment.id}`)
            continue
          }

          // Verificar telefone
          if (!appointment.endUser.phone) {
            console.log(`❌ [CRON] Cliente ${appointment.endUser.name} não possui telefone`)
            continue
          }

          // Preparar dados do template
          const appointmentDate = new Date(appointment.dateTime)
          const templateData = {
            clientName: appointment.endUser.name,
            businessName: appointment.tenant.businessName || 'Nossa Barbearia',
            service: appointment.services.map(s => s.name).join(', '),
            professional: appointment.professional?.name || 'Profissional',
            date: formatBrazilDate(appointmentDate),
            time: formatBrazilTime(appointmentDate)
          }

          // Gerar e enviar mensagem
          const message = whatsappTemplates[config.template](templateData)
          
          const success = await sendWhatsAppMessage({
            to: appointment.endUser.phone,
            message,
            type: 'reminder'
          })

          if (success) {
            // Registrar envio
            await prisma.$executeRaw`
              INSERT INTO appointment_reminders (id, appointmentId, reminderType, sentAt, createdAt)
              VALUES (${generateId()}, ${appointment.id}, ${config.type}, ${now}, ${now})
            `

            totalSent++
            console.log(`✅ [CRON] Lembrete ${config.type} enviado para ${appointment.endUser.name}`)
            
            // Delay entre envios
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          console.error(`❌ [CRON] Erro ao processar agendamento ${appointment.id}:`, error)
        }
      }

    } catch (error) {
      console.error(`❌ [CRON] Erro ao processar ${config.type}:`, error)
    }
  }

  console.log(`✅ [CRON] Processamento concluído. Total de lembretes enviados: ${totalSent}`)
  return totalSent
}

// Execute and exit
sendWhatsappReminders()
  .then((totalSent) => {
    console.log(`🎯 [CRON] CRON job concluído. ${totalSent} lembretes enviados.`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ [CRON] Erro fatal no cron job:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
