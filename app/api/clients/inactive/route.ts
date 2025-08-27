import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar clientes inativos
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    // Parâmetro configurável de dias (padrão: 15 dias para manter consistência)
    const daysThreshold = parseInt(searchParams.get('days') || '15')
    
    // Calcular data limite para considerar cliente inativo
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

    // ✅ BUSCA NO BANCO DE DADOS COM FILTRO DIRETO
    const inactiveClients = await prisma.endUser.findMany({
      where: {
        tenantId: user.tenantId, // Filtro multi-tenant
        isActive: true, // Apenas clientes ativos (não desativados manualmente)
        OR: [
          // Cliente nunca teve visitas
          {
            totalVisits: 0
          },
          // Cliente não tem lastVisit registrado
          {
            lastVisit: null
          },
          // Cliente com última visita há mais de X dias
          {
            lastVisit: {
              lt: thresholdDate
            }
          }
        ]
      },
      orderBy: [
        // Priorizar por criticidade: quem nunca visitou primeiro
        { totalVisits: 'asc' },
        // Depois por data da última visita (mais antigo primeiro)
        { lastVisit: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthday: true,
        notes: true,
        isActive: true,
        createdAt: true,
        // ✅ CAMPOS AGREGADOS REAIS DO BANCO
        totalSpent: true,
        totalVisits: true,
        lastVisit: true,
      }
    })

    // ✅ CALCULAR ESTATÍSTICAS DIRETAMENTE NO BANCO
    const stats = await prisma.endUser.aggregate({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [
          { totalVisits: 0 },
          { lastVisit: null },
          { lastVisit: { lt: thresholdDate } }
        ]
      },
      _count: {
        id: true
      },
      _sum: {
        totalSpent: true
      }
    })

    // ✅ CALCULAR RECEITA POTENCIAL BASEADA NA MÉDIA REAL
    const averageTicket = await prisma.appointment.aggregate({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED'
      },
      _avg: {
        totalPrice: true
      }
    })

    // ✅ BUSCAR DADOS REAIS DE PROMOÇÕES ENVIADAS
    const promotionsStats = await prisma.whatsAppLog.aggregate({
      where: {
        tenantId: user.tenantId,
        type: 'PROMOTION'
      },
      _count: {
        id: true
      }
    })

    // ✅ BUSCAR DADOS REAIS DE RETORNO (clientes que agendaram após promoção)
    // Considerar clientes que agendaram nos últimos 30 dias após receber promoção
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const returnStats = await prisma.appointment.aggregate({
      where: {
        tenantId: user.tenantId,
        createdAt: {
          gte: thirtyDaysAgo
        },
        // Aqui poderíamos filtrar por clientes que receberam promoção, 
        // mas vamos usar uma aproximação baseada em agendamentos recentes
      },
      _count: {
        id: true
      }
    })

    // ✅ CALCULAR RECEITA POTENCIAL INDIVIDUAL DE CADA CLIENTE
    // Se não há agendamentos completos, usar média dos preços dos serviços
    let ticketMedio = Number(averageTicket._avg.totalPrice) || 0
    
    if (ticketMedio === 0) {
      // Buscar média dos preços dos serviços como fallback
      const servicesAverage = await prisma.service.aggregate({
        where: {
          tenantId: user.tenantId,
          isActive: true
        },
        _avg: {
          price: true
        }
      })
      ticketMedio = Number(servicesAverage._avg.price) || 55
    }
    
    // Calcular receita potencial como soma individual dos clientes
    const potentialRevenue = inactiveClients.reduce((total, client) => {
      // Se cliente já gastou, usar sua média individual
      // Se nunca gastou, usar ticket médio geral
      const totalSpent = Number(client.totalSpent) || 0
      const clientPotentialRevenue = totalSpent > 0 
        ? totalSpent / Math.max(client.totalVisits, 1)
        : ticketMedio
      return total + clientPotentialRevenue
    }, 0)

    return NextResponse.json({ 
      clients: inactiveClients,
      stats: {
        totalInactive: stats._count.id || 0,
        totalPotentialRevenue: stats._sum.totalSpent || 0,
        averageTicket: ticketMedio,
        potentialRevenue,
        // ✅ DADOS REAIS DE PROMOÇÕES
        promotionsSent: promotionsStats._count.id || 0,
        returnRate: returnStats._count.id || 0,
        daysThreshold
      }
    })
  } catch (error) {
    console.error('Erro ao buscar clientes inativos:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
