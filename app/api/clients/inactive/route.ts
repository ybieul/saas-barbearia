import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar clientes inativos
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    // Parâmetro configurável de dias (padrão: 45 dias)
    const daysThreshold = parseInt(searchParams.get('days') || '45')
    
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

    const potentialRevenue = (stats._count.id || 0) * (Number(averageTicket._avg.totalPrice) || 45)

    return NextResponse.json({ 
      clients: inactiveClients,
      stats: {
        totalInactive: stats._count.id || 0,
        totalPotentialRevenue: stats._sum.totalSpent || 0,
        averageTicket: Number(averageTicket._avg.totalPrice) || 45,
        potentialRevenue,
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
