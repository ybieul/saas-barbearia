import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

function verifyToken(request: NextRequest): AuthUser {
  // Tentar obter token do header Authorization
  let token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Se não tiver no header, tentar obter do cookie
  if (!token) {
    token = request.cookies.get('token')?.value
  }
  
  // Se ainda não tiver, tentar obter do header x-auth-token
  if (!token) {
    token = request.headers.get('x-auth-token') || undefined
  }

  if (!token) {
    throw new Error('Token não fornecido')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    
    if (!decoded.tenantId) {
      throw new Error('Token inválido: tenantId não encontrado')
    }

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    throw new Error('Token inválido')
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação JWT
    const user = verifyToken(req)

    const { searchParams } = new URL(req.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // Filtro opcional por tipo

    console.log(`🔍 [API] Buscando WhatsApp logs para tenant ${user.tenantId} - Últimas ${hours}h`)

    // Calcular data de início
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    // ✅ BUSCA UNIFICADA - TABELA 1: whatsapp_logs
    const whereClauseWhatsApp: any = {
      tenantId: user.tenantId,
      createdAt: {
        gte: startDate
      }
    }

    if (type) {
      whereClauseWhatsApp.type = type.toUpperCase()
    }

    const whatsAppLogs = await prisma.whatsAppLog.findMany({
      where: whereClauseWhatsApp,
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.ceil(limit / 2), // Dividir limite entre as duas tabelas
      select: {
        id: true,
        to: true,
        message: true,
        type: true,
        status: true,
        sentAt: true,
        createdAt: true,
        errorMessage: true,
        attempts: true
      }
    })

    console.log(`📋 [API] Encontrados ${whatsAppLogs.length} logs em whatsapp_logs`)

    // ✅ BUSCA UNIFICADA - TABELA 2: appointment_reminders
    const appointmentReminders = await prisma.appointmentReminder.findMany({
      where: {
        appointment: {
          tenantId: user.tenantId
        },
        createdAt: {
          gte: startDate
        },
        ...(type && {
          reminderType: type.toLowerCase()
        })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.ceil(limit / 2),
      include: {
        appointment: {
          select: {
            id: true,
            tenantId: true,
            totalPrice: true,
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
            },
            professional: {
              select: {
                name: true
              }
            },
            tenant: {
              select: {
                businessName: true
              }
            }
          }
        }
      }
    })

    console.log(`📋 [API] Encontrados ${appointmentReminders.length} logs em appointment_reminders`)

    // ✅ NORMALIZAR DADOS DE appointment_reminders PARA FORMATO whatsapp_logs
    const normalizedReminders = appointmentReminders.map(reminder => {
      const appointment = reminder.appointment
      const clientName = appointment.endUser?.name || 'Cliente'
      const serviceName = appointment.services?.[0]?.name || 'Serviço'
      const professionalName = appointment.professional?.name || 'Profissional'
      const businessName = appointment.tenant?.businessName || 'Estabelecimento'

      // Gerar mensagem simulada baseada no tipo
      let simulatedMessage = ''
      switch (reminder.reminderType) {
        case 'confirmation':
          simulatedMessage = `✅ Agendamento confirmado! Olá *${clientName}*! Seu agendamento na *${businessName}* foi confirmado. Serviço: ${serviceName}, Profissional: ${professionalName}`
          break
        case 'reminder_24h':
          simulatedMessage = `🔔 Lembrete de 24h! Olá *${clientName}*! Não esqueça do seu agendamento amanhã na *${businessName}*. Serviço: ${serviceName}`
          break
        case 'reminder_12h':
          simulatedMessage = `⏰ Lembrete de 12h! Olá *${clientName}*! Seu agendamento na *${businessName}* é hoje. Serviço: ${serviceName}`
          break
        case 'reminder_2h':
          simulatedMessage = `⚡ Lembrete de 2h! Olá *${clientName}*! Seu horário na *${businessName}* é em 2 horas. Serviço: ${serviceName}`
          break
        default:
          simulatedMessage = `📱 Mensagem automática para *${clientName}* sobre agendamento na *${businessName}*`
      }

      // Mapear tipo de reminder para formato WhatsAppType
      let whatsAppType: any = 'CUSTOM'
      switch (reminder.reminderType) {
        case 'confirmation':
          whatsAppType = 'CONFIRMATION'
          break
        case 'reminder_24h':
          whatsAppType = 'REMINDER_24H'
          break
        case 'reminder_12h':
          whatsAppType = 'REMINDER_24H' // Usar 24H como fallback
          break
        case 'reminder_2h':
          whatsAppType = 'REMINDER_2H'
          break
      }

      return {
        id: reminder.id,
        to: appointment.endUser?.phone || 'Não informado',
        message: simulatedMessage,
        type: whatsAppType,
        status: 'SENT' as any, // Assumir que foi enviado com sucesso
        sentAt: reminder.sentAt.toISOString(),
        createdAt: reminder.createdAt.toISOString(),
        errorMessage: null,
        attempts: 0
      }
    })

    // ✅ COMBINAR E ORDENAR TODOS OS LOGS
    const allLogs = [
      ...whatsAppLogs.map(log => ({
        ...log,
        sentAt: log.sentAt?.toISOString() || null,
        createdAt: log.createdAt.toISOString()
      })),
      ...normalizedReminders
    ]

    // Ordenar por data de criação (mais recentes primeiro)
    allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Aplicar limite final
    const logs = allLogs.slice(0, limit)

    // ✅ CALCULAR ESTATÍSTICAS UNIFICADAS
    const statsWhatsApp = await prisma.whatsAppLog.groupBy({
      by: ['status'],
      where: whereClauseWhatsApp,
      _count: {
        id: true
      }
    })

    const statsReminders = await prisma.appointmentReminder.groupBy({
      by: ['reminderType'],
      where: {
        appointment: {
          tenantId: user.tenantId
        },
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      }
    })

    // Calcular totais unificados
    const totalWhatsApp = whatsAppLogs.length
    const totalReminders = appointmentReminders.length
    const sentWhatsApp = statsWhatsApp.find(s => s.status === 'SENT')?._count.id || 0
    const deliveredWhatsApp = statsWhatsApp.find(s => s.status === 'DELIVERED')?._count.id || 0
    const failedWhatsApp = statsWhatsApp.find(s => s.status === 'FAILED')?._count.id || 0

    const statsFormatted = {
      total: totalWhatsApp + totalReminders,
      sent: sentWhatsApp + totalReminders, // Reminders são considerados enviados
      delivered: deliveredWhatsApp + totalReminders, // Reminders são considerados entregues
      read: statsWhatsApp.find(s => s.status === 'READ')?._count.id || 0,
      failed: failedWhatsApp,
      pending: statsWhatsApp.find(s => s.status === 'PENDING')?._count.id || 0
    }

    console.log(`✅ [API] Total unificado: ${logs.length} mensagens (${totalWhatsApp} whatsapp_logs + ${totalReminders} appointment_reminders)`)

    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats: statsFormatted,
        breakdown: {
          whatsapp_logs: totalWhatsApp,
          appointment_reminders: totalReminders
        }
      }
    })

  } catch (error) {
    console.error('❌ [API] Erro ao buscar WhatsApp logs:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
