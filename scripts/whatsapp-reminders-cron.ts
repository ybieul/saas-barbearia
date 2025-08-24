#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import { sendWhatsAppMessage, whatsappTemplates } from '../lib/whatsapp'
import { getBrazilNow, formatBrazilDate, formatBrazilTime } from '../lib/timezone'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// Função para gerar ID único (similar ao cuid do Prisma)
function generateId(): string {
  return randomBytes(12).toString('base64url')
}

interface ReminderConfig {
  type: string
  hoursBefore: number
  minutesBefore: number
}

// Configurações dos lembretes
const REMINDER_CONFIGS: ReminderConfig[] = [
  { type: 'reminder_24h', hoursBefore: 24, minutesBefore: 0 },
  { type: 'reminder_12h', hoursBefore: 12, minutesBefore: 0 },
  { type: 'reminder_2h', hoursBefore: 2, minutesBefore: 0 },
]

async function processReminders() {
  console.log(`[${new Date().toISOString()}] Iniciando processamento de lembretes...`)
  
  const now = getBrazilNow()
  let totalSent = 0

  for (const config of REMINDER_CONFIGS) {
    try {
      console.log(`Processando ${config.type}...`)
      
      // Calcular janela de tempo
      const exactTime = new Date(now)
      exactTime.setHours(exactTime.getHours() + config.hoursBefore, config.minutesBefore, 0, 0)
      
      // Janela de 10 minutos para capturar agendamentos (5 min antes e depois do tempo exato)
      const windowStart = new Date(exactTime)
      windowStart.setMinutes(windowStart.getMinutes() - 5)
      
      const windowEnd = new Date(exactTime)
      windowEnd.setMinutes(windowEnd.getMinutes() + 5)

      console.log(`Buscando agendamentos entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`)

      // Query para encontrar agendamentos que precisam de lembrete
      const appointmentsToRemind = await prisma.appointment.findMany({
        where: {
          dateTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED'] // Apenas agendamentos ativos
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

      // Filtrar apenas os que têm automação ativa e não receberam lembrete ainda
      const filteredAppointments = []
      for (const appointment of appointmentsToRemind) {
        // Verificar se a automação está ativa
        const automationSetting = await prisma.$queryRaw`
          SELECT * FROM automation_settings 
          WHERE establishment_id = ${appointment.tenantId} 
          AND automation_type = ${config.type} 
          AND is_enabled = true
          LIMIT 1
        ` as any[]
        
        if (automationSetting.length === 0) continue

        // Verificar se não foi enviado ainda
        const existingReminder = await prisma.$queryRaw`
          SELECT * FROM appointment_reminders 
          WHERE appointment_id = ${appointment.id} 
          AND reminder_type = ${config.type}
          LIMIT 1
        ` as any[]
        
        if (existingReminder.length === 0) {
          filteredAppointments.push(appointment)
        }
      }

      console.log(`Encontrados ${filteredAppointments.length} agendamentos para ${config.type}`)

      // Processar cada agendamento
      for (const appointment of filteredAppointments) {
        try {
          await sendReminderMessage(appointment, config.type)
          
          // Registrar o envio usando query raw
          await prisma.$executeRaw`
            INSERT INTO appointment_reminders (id, appointment_id, reminder_type, sent_at, created_at)
            VALUES (${generateId()}, ${appointment.id}, ${config.type}, ${now}, ${now})
          `

          totalSent++
          console.log(`✅ Lembrete ${config.type} enviado para ${appointment.endUser.name}`)
          
          // Pequeno delay entre envios para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete para agendamento ${appointment.id}:`, error)
        }
      }

    } catch (error) {
      console.error(`❌ Erro ao processar ${config.type}:`, error)
    }
  }

  console.log(`[${new Date().toISOString()}] Processamento concluído. Total de lembretes enviados: ${totalSent}`)
  return totalSent
}

async function sendReminderMessage(appointment: any, reminderType: string) {
  if (!appointment.endUser.phone) {
    throw new Error('Cliente não possui telefone cadastrado')
  }

  // Preparar dados para o template
  const appointmentDate = new Date(appointment.dateTime)
  const templateData = {
    clientName: appointment.endUser.name,
    businessName: appointment.tenant.businessName || 'Nossa Barbearia',
    service: appointment.services.map((s: any) => s.name).join(', ') || 'Serviço',
    professional: appointment.professional?.name || 'Profissional',
    date: formatBrazilDate(appointmentDate),
    time: formatBrazilTime(appointmentDate),
    totalTime: appointment.services.reduce((total: number, s: any) => total + s.duration, 0),
    price: appointment.totalPrice,
    businessPhone: appointment.tenant.businessPhone || '',
  }

  // Gerar mensagem baseada no tipo
  let message = ''
  switch (reminderType) {
    case 'reminder_24h':
      message = whatsappTemplates.reminder24h(templateData)
      break
    case 'reminder_12h':
      message = whatsappTemplates.reminder24h(templateData) // Usar template de 24h como fallback
      break
    case 'reminder_2h':
      message = whatsappTemplates.reminder2h(templateData)
      break
    default:
      throw new Error(`Tipo de lembrete desconhecido: ${reminderType}`)
  }

  // Enviar mensagem
  const success = await sendWhatsAppMessage({
    to: appointment.endUser.phone,
    message,
    type: reminderType as any,
  })

  if (!success) {
    throw new Error('Falha ao enviar mensagem via WhatsApp')
  }

  return success
}

// Executar se chamado diretamente
if (require.main === module) {
  processReminders()
    .then((totalSent) => {
      console.log(`✅ Cron job concluído. ${totalSent} lembretes enviados.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro fatal no cron job:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { processReminders }
