import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBrazilNow, getBrazilStartOfDay, getBrazilEndOfDay, toBrazilDateString } from '@/lib/timezone'

// GET - Buscar estatísticas do WhatsApp do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    console.log('📊 Buscando estatísticas WhatsApp para tenant:', user.tenantId)

    // Obter horário brasileiro atual
    const brazilNow = getBrazilNow()
    const startOfDay = getBrazilStartOfDay(brazilNow)
    const endOfDay = getBrazilEndOfDay(brazilNow)
    
    console.log('📅 Período: hoje', startOfDay.toISOString(), 'até', endOfDay.toISOString())

    // Buscar mensagens WhatsApp enviadas hoje
    const whatsappMessages = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN message_type = 'confirmation' THEN 1 ELSE 0 END) as confirmations,
        SUM(CASE WHEN message_type LIKE 'reminder%' THEN 1 ELSE 0 END) as reminders
      FROM whatsapp_logs 
      WHERE establishment_id = ${user.tenantId}
      AND created_at >= ${startOfDay}
      AND created_at <= ${endOfDay}
    ` as any[]

    // Buscar lembretes de agendamentos enviados hoje
    const appointmentReminders = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
        message_type
      FROM appointment_reminders 
      WHERE establishment_id = ${user.tenantId}
      AND sent_at >= ${startOfDay}
      AND sent_at <= ${endOfDay}
      GROUP BY message_type
    ` as any[]

    // Buscar clientes inativos (15+ dias sem agendamento)
    const fifteenDaysAgo = new Date(brazilNow)
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const inactiveClients = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT eu.id) as count
      FROM end_users eu
      LEFT JOIN appointments a ON eu.id = a.client_id 
        AND a.tenant_id = ${user.tenantId}
        AND a.date_time >= ${fifteenDaysAgo}
      WHERE eu.tenant_id = ${user.tenantId}
      AND eu.is_active = true
      AND a.id IS NULL
    ` as any[]

    // Processar dados do WhatsApp
    const whatsappStats = whatsappMessages[0] || { total: 0, delivered: 0, confirmations: 0, reminders: 0 }
    const reminderStats = appointmentReminders.reduce((acc, curr) => {
      acc.total += parseInt(curr.total) || 0
      acc.delivered += parseInt(curr.delivered) || 0
      return acc
    }, { total: 0, delivered: 0 })

    // Calcular totais
    const totalMessages = parseInt(whatsappStats.total) + reminderStats.total
    const totalDelivered = parseInt(whatsappStats.delivered) + reminderStats.delivered
    const confirmationMessages = parseInt(whatsappStats.confirmations) || 0
    const reminderMessages = parseInt(whatsappStats.reminders) + reminderStats.total
    const inactiveCount = parseInt(inactiveClients[0]?.count) || 0

    // Calcular taxa de entrega
    const deliveryRate = totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0

    // Calcular redução de faltas baseada em automações ativas
    const automationSettings = await prisma.$queryRaw`
      SELECT automationType, isEnabled
      FROM automation_settings 
      WHERE establishmentId = ${user.tenantId}
      AND isEnabled = true
    ` as any[]

    const activeAutomations = automationSettings.length
    const reductionRate = Math.min(95, Math.max(70, 70 + (activeAutomations * 5)))

    console.log('📊 Estatísticas calculadas:', {
      totalMessages,
      totalDelivered,
      deliveryRate,
      confirmationMessages,
      reminderMessages,
      inactiveCount,
      reductionRate,
      activeAutomations
    })

    const stats = {
      mensagensHoje: {
        total: totalMessages,
        confirmacoes: confirmationMessages,
        lembretes: reminderMessages,
        descricao: `${confirmationMessages} confirmações, ${reminderMessages} lembretes`
      },
      taxaEntrega: {
        taxa: deliveryRate,
        entregues: totalDelivered,
        total: totalMessages,
        descricao: `${totalDelivered} de ${totalMessages} entregues`
      },
      reducaoFaltas: {
        taxa: reductionRate,
        baseadoEm: activeAutomations,
        descricao: `Baseado em ${activeAutomations} automações ativas`
      },
      clientesInativos: {
        total: inactiveCount,
        descricao: "Para reativação"
      }
    }

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas WhatsApp:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
