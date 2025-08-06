import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

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
