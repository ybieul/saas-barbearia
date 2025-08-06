import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Buscar estatísticas reais de promoções enviadas para clientes inativos
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    // ✅ BUSCAR PROMOÇÕES ENVIADAS DO BANCO DE DADOS
    const promotionsStats = await prisma.whatsAppLog.aggregate({
      where: {
        tenantId: user.tenantId,
        type: 'PROMOTION', // Apenas promoções
        // Filtrar por período (últimos 30 dias)
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
        }
      },
      _count: {
        id: true
      }
    })

    // ✅ BUSCAR PROMOÇÕES ENVIADAS COM SUCESSO
    const successfulPromotions = await prisma.whatsAppLog.aggregate({
      where: {
        tenantId: user.tenantId,
        type: 'PROMOTION',
        status: {
          in: ['SENT', 'DELIVERED', 'READ'] // Considerar como sucesso
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        id: true
      }
    })

    // ✅ BUSCAR CLIENTES QUE AGENDARAM APÓS RECEBER PROMOÇÃO (últimos 30 dias)
    // Primeiro buscar telefones que receberam promoções
    const promotionPhones = await prisma.whatsAppLog.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'PROMOTION',
        status: {
          in: ['SENT', 'DELIVERED', 'READ']
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: { to: true }
    })

    // Depois buscar IDs dos clientes com esses telefones
    const clientIds = await prisma.endUser.findMany({
      where: {
        tenantId: user.tenantId,
        phone: {
          in: promotionPhones.map(log => log.to)
        }
      },
      select: { id: true }
    })

    // Finalmente contar agendamentos desses clientes
    const returningClients = await prisma.appointment.count({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        endUserId: {
          in: clientIds.map(client => client.id)
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const totalPromotionsSent = promotionsStats._count.id || 0
    const successfulPromotionsCount = successfulPromotions._count.id || 0

    // ✅ CALCULAR TAXA DE RETORNO REAL
    const returnRate = totalPromotionsSent > 0 
      ? Math.round((returningClients / totalPromotionsSent) * 100)
      : 0

    return NextResponse.json({
      promotionsSent: totalPromotionsSent,
      successfulPromotions: successfulPromotionsCount,
      clientsWhoReturned: returningClients,
      returnRate,
      period: '30 dias'
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de promoções:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Enviar promoção para clientes inativos
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { clientIds, templateId, message } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { message: 'Lista de clientes é obrigatória' },
        { status: 400 }
      )
    }

    if (!templateId && !message) {
      return NextResponse.json(
        { message: 'Template ou mensagem é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se todos os clientes pertencem ao tenant
    const clients = await prisma.endUser.findMany({
      where: {
        id: { in: clientIds },
        tenantId: user.tenantId
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    })

    if (clients.length !== clientIds.length) {
      return NextResponse.json(
        { message: 'Alguns clientes não foram encontrados' },
        { status: 400 }
      )
    }

    // Registrar o envio da promoção no log (opcional)
    const promotionLog = await prisma.whatsAppLog.createMany({
      data: clients.map(client => ({
        tenantId: user.tenantId,
        to: client.phone,
        type: 'PROMOTION',
        message: message || `Promoção enviada via template ${templateId}`,
        status: 'SENT',
        sentAt: new Date()
      }))
    })

    return NextResponse.json({ 
      message: 'Promoções enviadas com sucesso',
      sentCount: clients.length,
      clients: clients.map(c => ({ id: c.id, name: c.name, phone: c.phone }))
    })
  } catch (error) {
    console.error('Erro ao enviar promoções:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
