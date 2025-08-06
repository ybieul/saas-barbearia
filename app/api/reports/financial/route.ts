import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatBrazilDate } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando geração de relatório financeiro...')
    console.log('Request URL:', request.url)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const authUser = verifyToken(request)
    console.log('👤 Usuário autenticado:', authUser ? 'Sim' : 'Não')
    console.log('🏢 TenantId:', authUser?.tenantId)
    
    if (!authUser?.tenantId) {
      console.log('❌ Unauthorized: tenantId não encontrado')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'today'
    
    console.log('📅 Parâmetros recebidos:', { startDate, endDate, period })

    // Calcular datas baseado no período
    let dateFilter: any = {}
    let periodLabel = 'Hoje'
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    console.log('🕐 Data atual:', now)
    console.log('📅 Hoje (início do dia):', today)
    
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

    console.log('📊 Filtro de data configurado:', dateFilter)
    console.log('🏷️ Período selecionado:', periodLabel)

    // Buscar dados do estabelecimento
    console.log('🔍 Buscando dados do estabelecimento...')
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

    console.log('🏢 Estabelecimento encontrado:', establishment ? establishment.businessName : 'Não encontrado')

    if (!establishment) {
      console.log('❌ Estabelecimento não encontrado para tenantId:', authUser.tenantId)
      return NextResponse.json({ error: 'Establishment not found' }, { status: 404 })
    }

    // Buscar transações do período
    console.log('🔍 Buscando agendamentos concluídos...')
    console.log('Filtros da query:', {
      tenantId: authUser.tenantId,
      status: 'COMPLETED',
      dateFilter
    })
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

    console.log('📊 Agendamentos encontrados:', appointments.length)
    console.log('💰 Primeiros 3 agendamentos (amostra):', appointments.slice(0, 3).map(app => ({
      id: app.id,
      totalPrice: app.totalPrice,
      createdAt: app.createdAt,
      endUser: app.endUser?.name
    })))

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
        serviceName: service || 'Serviço não informado',
        total: Number(data.total) || 0,
        count: Number(data.count) || 0,
        percentage: totalRevenue > 0 ? ((Number(data.total) / totalRevenue) * 100).toFixed(1) : '0'
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
        professionalName: professional || 'Profissional não informado',
        total: Number(data.total) || 0,
        count: Number(data.count) || 0,
        percentage: totalRevenue > 0 ? ((Number(data.total) / totalRevenue) * 100).toFixed(1) : '0'
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
      total: last30Days.reduce((sum, day) => sum + (day.revenue || 0), 0),
      average: last30Days.reduce((sum, day) => sum + (day.revenue || 0), 0) / 30,
      best: Math.max(...last30Days.map(day => day.revenue || 0)),
      bestDate: last30Days.find(day => day.revenue === Math.max(...last30Days.map(d => d.revenue || 0)))?.date || '',
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
        method: method || 'Não informado',
        count: Number(data.count) || 0,
        amount: Number(data.amount) || 0,
        percentage: totalAppointments > 0 ? ((Number(data.count) / totalAppointments) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.amount - a.amount)

    // Montar resposta final
    console.log('📋 Montando resposta final...')
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
        conversionRate: Number(conversionRate).toFixed(1)
      },
      transactions,
      revenueByService,
      revenueByProfessional,
      dailyRevenue: dailyRevenueStats,
      paymentMethods: paymentMethodsStats
    }

    console.log('✅ Relatório montado com sucesso')
    console.log('📊 Resumo dos dados:', {
      establishment: reportData.establishment.name,
      totalRevenue,
      totalAppointments,
      transactionsCount: transactions.length,
      servicesCount: revenueByService.length,
      professionalsCount: revenueByProfessional.length,
      dailyRevenueDataCount: dailyRevenueStats.data.length,
      paymentMethodsCount: paymentMethodsStats.length
    })

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('❌ Erro ao gerar relatório financeiro:')
    console.error('Tipo do erro:', typeof error)
    console.error('Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    
    // Log do request para debug
    console.error('Request URL:', request.url)
    console.error('Request headers:', Object.fromEntries(request.headers.entries()))
    
    if (error instanceof Error) {
      // Erros específicos que podemos tratar
      if (error.message.includes('prisma') || error.message.includes('database')) {
        console.error('🔴 Erro de banco de dados detectado')
        return NextResponse.json(
          { 
            error: 'Erro de conexão com banco de dados',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
            timestamp: new Date().toISOString(),
            code: 'DATABASE_ERROR'
          },
          { status: 500 }
        )
      }
      
      if (error.message.includes('token') || error.message.includes('jwt') || error.message.includes('auth')) {
        console.error('🔴 Erro de autenticação detectado')
        return NextResponse.json(
          { 
            error: 'Erro de autenticação',
            details: 'Token inválido ou expirado',
            timestamp: new Date().toISOString(),
            code: 'AUTH_ERROR'
          },
          { status: 401 }
        )
      }

      if (error.message.includes('tenant') || error.message.includes('business')) {
        console.error('🔴 Erro de tenant/business detectado')
        return NextResponse.json(
          { 
            error: 'Negócio não encontrado',
            details: 'Verifique se sua conta tem acesso a este negócio',
            timestamp: new Date().toISOString(),
            code: 'BUSINESS_NOT_FOUND'
          },
          { status: 404 }
        )
      }
    }

    // Erro genérico com ID para rastreamento
    const errorId = crypto.randomUUID()
    console.error('🔴 Erro ID para rastreamento:', errorId)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          'Ocorreu um erro inesperado. Entre em contato com o suporte.',
        timestamp: new Date().toISOString(),
        errorId,
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}
