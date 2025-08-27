import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação usando o sistema de tokens existente
    const authUser = verifyToken(request)
    const tenantId = authUser.tenantId

    // Buscar mensagens do WhatsAppLog (promoções, reativações)
    const whatsappLogs = await prisma.whatsAppLog.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar a 50 mensagens mais recentes
    })

    // Buscar appointment reminders com dados dos clientes
    const appointmentReminders = await prisma.appointmentReminder.findMany({
      include: {
        appointment: {
          include: {
            endUser: {
              select: {
                name: true,
                phone: true
              }
            },
            services: {
              select: {
                name: true
              }
            }
          }
        }
      },
      where: {
        appointment: {
          tenantId: tenantId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar a 50 mensagens mais recentes
    })

    // Unificar as mensagens em um formato padronizado
    const unifiedMessages = [
      // Mensagens do WhatsAppLog
      ...whatsappLogs.map(log => ({
        id: log.id,
        clientName: extractClientNameFromMessage(log.message) || 'Cliente',
        clientPhone: log.to,
        message: log.message,
        type: mapWhatsAppTypeToLegacy(log.type),
        status: mapWhatsAppStatusToLegacy(log.status),
        sentAt: log.sentAt || log.createdAt,
        createdAt: log.createdAt,
        source: 'whatsapp_logs' as const
      })),
      
      // Mensagens do AppointmentReminder
      ...appointmentReminders.map(reminder => ({
        id: reminder.id,
        clientName: reminder.appointment.endUser?.name || 'Cliente',
        clientPhone: reminder.appointment.endUser?.phone || '',
        message: generateReminderMessage(reminder, reminder.appointment),
        type: mapReminderTypeToLegacy(reminder.reminderType),
        status: 'sent' as const, // AppointmentReminder sempre são consideradas enviadas
        sentAt: reminder.sentAt,
        createdAt: reminder.createdAt,
        source: 'appointment_reminders' as const
      }))
    ]

    // Ordenar por data de criação (mais recentes primeiro)
    unifiedMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calcular estatísticas
    const stats = {
      total: unifiedMessages.length,
      sent: unifiedMessages.filter(msg => 
        ['sent', 'delivered', 'read'].includes(msg.status)
      ).length,
      delivered: unifiedMessages.filter(msg => 
        ['delivered', 'read'].includes(msg.status)
      ).length,
      read: unifiedMessages.filter(msg => msg.status === 'read').length,
      failed: unifiedMessages.filter(msg => msg.status === 'failed').length,
      pending: unifiedMessages.filter(msg => msg.status === 'pending').length
    }

    return NextResponse.json({
      messages: unifiedMessages.slice(0, 20), // Retornar apenas 20 mais recentes para o frontend
      stats,
      success: true
    })

  } catch (error) {
    console.error('❌ Erro ao buscar mensagens WhatsApp:', error)
    
    // Se for erro de autenticação, retornar 401
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { error: 'Não autorizado', success: false },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}

// Funções auxiliares para mapeamento
function mapWhatsAppTypeToLegacy(type: string): string {
  const mapping: Record<string, string> = {
    'CONFIRMATION': 'confirmation',
    'REMINDER_24H': 'reminder',
    'REMINDER_2H': 'reminder', 
    'REACTIVATION': 'reactivation',
    'PROMOTION': 'reactivation',
    'CUSTOM': 'custom'
  }
  return mapping[type] || 'custom'
}

function mapWhatsAppStatusToLegacy(status: string): string {
  const mapping: Record<string, string> = {
    'PENDING': 'pending',
    'SENT': 'sent',
    'DELIVERED': 'delivered',
    'READ': 'read',
    'FAILED': 'failed'
  }
  return mapping[status] || 'pending'
}

function mapReminderTypeToLegacy(reminderType: string): string {
  const mapping: Record<string, string> = {
    'confirmation': 'confirmation',
    'reminder_24h': 'reminder',
    'reminder_12h': 'reminder',
    'reminder_2h': 'reminder',
    'reactivation': 'reactivation'
  }
  return mapping[reminderType] || 'confirmation'
}

function extractClientNameFromMessage(message: string): string | null {
  // Tentar extrair nome da mensagem usando regex
  const patterns = [
    /Olá ([^!,]+)!/,        // "Olá João!"
    /Oi ([^!,]+)!/,         // "Oi Maria!" 
    /([^,]+),/,             // "João, seu agendamento"
  ]
  
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

function generateReminderMessage(reminder: any, appointment: any): string {
  const clientName = appointment.endUser?.name || 'Cliente'
  const serviceName = appointment.services?.[0]?.name || 'Serviço'
  const date = new Date(appointment.dateTime).toLocaleDateString('pt-BR')
  const time = new Date(appointment.dateTime).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  switch (reminder.reminderType) {
    case 'confirmation':
      return `Olá ${clientName}! Seu agendamento de ${serviceName} foi confirmado para ${date} às ${time}.`
    
    case 'reminder_24h':
      return `Olá ${clientName}! Lembrete: você tem um agendamento amanhã (${date}) às ${time} para ${serviceName}.`
    
    case 'reminder_12h':
      return `Olá ${clientName}! Lembrete: você tem um agendamento hoje às ${time} para ${serviceName}.`
    
    case 'reminder_2h':
      return `Olá ${clientName}! Lembrete: seu agendamento de ${serviceName} é em 2 horas (${time}).`
    
    default:
      return `Mensagem de ${reminder.reminderType} para ${clientName} - ${serviceName} em ${date} às ${time}.`
  }
}
