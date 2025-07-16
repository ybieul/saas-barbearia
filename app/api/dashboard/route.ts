import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Buscar dados do dashboard do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'

    let startDate: Date
    let endDate: Date = new Date()

    switch (period) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'year':
        startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
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
            in: ['SCHEDULED', 'CONFIRMED']
          },
          dateTime: {
            gte: new Date() // Apenas futuros
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
            gte: new Date()
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
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
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
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
