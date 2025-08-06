import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatBrazilDate } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    const authUser = verifyToken(request)
    
    if (!authUser?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'today'

    // Calcular datas baseado no período
    let dateFilter: any = {}
    let periodLabel = 'Hoje'
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
      periodLabel = `${formatBrazilDate(new Date(startDate))} - ${formatBrazilDate(new Date(endDate))}`
    } else {
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          }
          periodLabel = 'Hoje'
          break
        case 'week':
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          dateFilter = {
            createdAt: {
              gte: weekStart,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          }
          periodLabel = 'Esta Semana'
          break
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          dateFilter = {
            createdAt: {
              gte: monthStart,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          }
          periodLabel = 'Este Mês'
          break
        case 'last30days':
          const thirtyDaysAgo = new Date(today)
          thirtyDaysAgo.setDate(today.getDate() - 30)
          dateFilter = {
            createdAt: {
              gte: thirtyDaysAgo,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          }
          periodLabel = 'Últimos 30 Dias'
          break
      }
    }

    // Buscar dados do estabelecimento
    const establishment = await prisma.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        name: true,
        businessName: true,
        businessCnpj: true,
        businessAddress: true,
        businessPhone: true,
        email: true
      }
    })

    if (!establishment) {
      return NextResponse.json({ error: 'Establishment not found' }, { status: 404 })
    }

    // Buscar transações do período
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: authUser.tenantId,
        status: 'COMPLETED',
        ...dateFilter
      },
      include: {
        endUser: {
          select: { name: true }
        },
        professional: {
          select: { name: true }
        },
        services: {
          select: { name: true, price: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular resumo financeiro
    const financialSummary = await prisma.appointment.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: {
        tenantId: authUser.tenantId,
        status: 'COMPLETED',
        ...dateFilter
      }
    })

    const totalRevenue = Number(financialSummary._sum.totalPrice || 0)
    const totalAppointments = Number(financialSummary._count || 0)
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0

    // Calcular taxa de conversão (agendamentos concluídos vs total)
    const totalAllAppointments = await prisma.appointment.count({
      where: {
        tenantId: authUser.tenantId,
        ...dateFilter
      }
    })
    const conversionRate = totalAllAppointments > 0 ? (totalAppointments / totalAllAppointments) * 100 : 0

    // Preparar transações formatadas
    const transactions = appointments.map(appointment => ({
      date: formatBrazilDate(appointment.createdAt),
      time: appointment.createdAt.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      client: appointment.endUser?.name || 'Cliente não informado',
      professional: appointment.professional?.name || 'Profissional não informado',
      services: appointment.services
        .map(service => service.name)
        .join(', '),
      amount: Number(appointment.totalPrice),
      method: appointment.paymentMethod || 'Não informado'
    }))

    // Receita por serviço
    const serviceRevenue = new Map<string, { total: number; count: number }>()
    appointments.forEach(appointment => {
      appointment.services.forEach(service => {
        const serviceName = service.name
        const current = serviceRevenue.get(serviceName) || { total: 0, count: 0 }
        serviceRevenue.set(serviceName, {
          total: current.total + Number(service.price),
          count: current.count + 1
        })
      })
    })

    const revenueByService = Array.from(serviceRevenue.entries())
      .map(([service, data]) => ({
        serviceName: service,
        total: data.total,
        count: data.count,
        percentage: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total)

    // Receita por profissional
    const professionalRevenue = new Map<string, { total: number; count: number }>()
    appointments.forEach(appointment => {
      const professionalName = appointment.professional?.name || 'Não informado'
      const current = professionalRevenue.get(professionalName) || { total: 0, count: 0 }
      professionalRevenue.set(professionalName, {
        total: current.total + Number(appointment.totalPrice),
        count: current.count + 1
      })
    })

    const revenueByProfessional = Array.from(professionalRevenue.entries())
      .map(([professional, data]) => ({
        professionalName: professional,
        total: data.total,
        count: data.count,
        percentage: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total)

    // Receita diária dos últimos 30 dias
    const last30Days: Array<{
      date: string;
      revenue: number;
      appointmentCount: number;
    }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000)

      const dayRevenue = await prisma.appointment.aggregate({
        _sum: { totalPrice: true },
        _count: { id: true },
        where: {
          tenantId: authUser.tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: dateStart,
            lt: dateEnd
          }
        }
      })

      last30Days.push({
        date: formatBrazilDate(date),
        revenue: Number(dayRevenue._sum.totalPrice || 0),
        appointmentCount: Number(dayRevenue._count || 0)
      })
    }

    const dailyRevenueStats = {
      total: last30Days.reduce((sum, day) => sum + day.revenue, 0),
      average: last30Days.reduce((sum, day) => sum + day.revenue, 0) / 30,
      best: Math.max(...last30Days.map(day => day.revenue)),
      bestDate: last30Days.find(day => day.revenue === Math.max(...last30Days.map(d => d.revenue)))?.date || '',
      data: last30Days
    }

    // Análise de métodos de pagamento
    const paymentMethods = new Map<string, { count: number; amount: number }>()
    appointments.forEach(appointment => {
      const method = appointment.paymentMethod || 'Não informado'
      const current = paymentMethods.get(method) || { count: 0, amount: 0 }
      paymentMethods.set(method, {
        count: current.count + 1,
        amount: current.amount + Number(appointment.totalPrice)
      })
    })

    const paymentMethodsStats = Array.from(paymentMethods.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: totalAppointments > 0 ? ((data.count / totalAppointments) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.amount - a.amount)

    // Montar resposta final
    const reportData = {
      establishment: {
        name: establishment.businessName || establishment.name || 'Estabelecimento',
        cnpj: establishment.businessCnpj || '',
        address: establishment.businessAddress || '',
        phone: establishment.businessPhone || '',
        email: establishment.email || ''
      },
      generatedBy: {
        name: authUser.email.split('@')[0] || 'Usuário',
        email: authUser.email
      },
      period: {
        label: periodLabel,
        start: startDate,
        end: endDate,
        generatedAt: new Date().toISOString()
      },
      summary: {
        totalRevenue,
        totalAppointments,
        averageTicket,
        conversionRate: conversionRate.toFixed(1)
      },
      transactions,
      revenueByService,
      revenueByProfessional,
      dailyRevenue: dailyRevenueStats,
      paymentMethods: paymentMethodsStats
    }

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
