import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBrazilNow, getBrazilStartOfDay, getBrazilEndOfDay, utcToBrazil } from '@/lib/timezone'

// GET - Buscar dados do dashboard do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'

    let startDate: Date
    let endDate: Date = getBrazilNow()

    switch (period) {
      case 'today':
        startDate = getBrazilStartOfDay(getBrazilNow())
        endDate = getBrazilEndOfDay(getBrazilNow())
        break
      case 'week':
        startDate = getBrazilStartOfDay(getBrazilNow())
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = getBrazilStartOfDay(getBrazilNow())
        const brazilCurrent = utcToBrazil(getBrazilNow())
        startDate.setMonth(brazilCurrent.getMonth() - 1)
        break
      case 'year':
        startDate = getBrazilStartOfDay(getBrazilNow())
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate = getBrazilStartOfDay(getBrazilNow())
        endDate = getBrazilEndOfDay(getBrazilNow())
    }

    // Métricas do tenant
    const [
      totalClients,
      activeClients,
      totalAppointments,
      completedAppointments,
      totalRevenue,
      pendingAppointments,
      cancelledAppointments,
      recentAppointments
    ] = await Promise.all([
      // Total de clientes do tenant
      prisma.endUser.count({
        where: { tenantId: user.tenantId }
      }),
      
      // Clientes ativos do tenant
      prisma.endUser.count({
        where: { 
          tenantId: user.tenantId,
          isActive: true 
        }
      }),
      
      // Total de agendamentos do período
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Agendamentos concluídos
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Receita total do período
      prisma.appointment.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      
      // Agendamentos pendentes/agendados
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: {
            in: ['CONFIRMED']
          },
          dateTime: {
            gte: getBrazilNow() // Apenas futuros
          }
        }
      }),
      
      // Agendamentos cancelados
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: 'CANCELLED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Próximos agendamentos
      prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilNow()
          },
          status: {
            in: ['CONFIRMED']
          }
        },
        take: 5,
        orderBy: { dateTime: 'asc' },
        include: {
          endUser: {
            select: {
              name: true,
              phone: true
            }
          },
          service: {
            select: {
              name: true,
              duration: true
            }
          },
          professional: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Calcular métricas
    const revenue = totalRevenue._sum.totalPrice || 0
    const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

    // Dados para gráficos - receita por dia (últimos 7 dias)
    const dailyRevenue = []
    for (let i = 6; i >= 0; i--) {
      const date = getBrazilStartOfDay(getBrazilNow())
      date.setDate(date.getDate() - i)
      
      const endOfDay = getBrazilEndOfDay(date)
      
      const dayRevenue = await prisma.appointment.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: date,
            lte: endOfDay
          }
        },
        _sum: {
          totalPrice: true
        }
      })
      
      dailyRevenue.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue._sum.totalPrice || 0
      })
    }

    return NextResponse.json({
      summary: {
        totalClients,
        activeClients,
        totalAppointments,
        completedAppointments,
        revenue: Number(revenue),
        pendingAppointments,
        conversionRate: Math.round(conversionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100
      },
      recentAppointments,
      dailyRevenue,
      period
    })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
