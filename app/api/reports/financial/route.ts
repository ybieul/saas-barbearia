import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatBrazilDate } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  try {
    console.log(`🔍 [${requestId}] Iniciando geração de relatório financeiro - ${new Date().toISOString()}`)
    console.log(`📝 [${requestId}] Request URL:`, request.url)
    
    // ========== ETAPA 1: VALIDAÇÃO DE AUTENTICAÇÃO ==========
    let authUser
    try {
      authUser = verifyToken(request)
      console.log(`👤 [${requestId}] Usuário autenticado:`, authUser ? 'Sim' : 'Não')
      console.log(`🏢 [${requestId}] TenantId:`, authUser?.tenantId)
    } catch (authError) {
      console.error(`❌ [${requestId}] Erro na verificação do token:`, authError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token de autenticação inválido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 401 }
      )
    }
    
    if (!authUser?.tenantId) {
      console.log(`❌ [${requestId}] Unauthorized: tenantId não encontrado`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso não autorizado - tenant não identificado',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 401 }
      )
    }

    // ========== ETAPA 2: VALIDAÇÃO DOS PARÂMETROS ==========
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'today'
    
    console.log(`📅 [${requestId}] Parâmetros recebidos:`, { startDate, endDate, period })

    // Validar parâmetros
    const validPeriods = ['today', 'week', 'month', 'last30days']
    if (!validPeriods.includes(period)) {
      console.log(`❌ [${requestId}] Período inválido:`, period)
      return NextResponse.json(
        { 
          success: false, 
          error: `Período inválido. Use: ${validPeriods.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 400 }
      )
    }

    // ========== ETAPA 3: CÁLCULO SEGURO DE DATAS ==========
    let dateFilter: any = {}
    let periodLabel = 'Hoje'
    
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      console.log(`🕐 [${requestId}] Data atual:`, now.toISOString())
      console.log(`📅 [${requestId}] Hoje (início do dia):`, today.toISOString())
      
      if (startDate && endDate) {
        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)
        
        // Validar datas
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          throw new Error('Datas inválidas fornecidas')
        }
        
        dateFilter = {
          createdAt: {
            gte: startDateObj,
            lte: endDateObj
          }
        }
        periodLabel = `${formatBrazilDate(startDateObj)} - ${formatBrazilDate(endDateObj)}`
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
          default:
            throw new Error(`Período não suportado: ${period}`)
        }
      }

      console.log(`📊 [${requestId}] Filtro de data configurado:`, dateFilter)
      console.log(`🏷️ [${requestId}] Período selecionado:`, periodLabel)
      
    } catch (dateError) {
      console.error(`❌ [${requestId}] Erro no cálculo de datas:`, dateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro no processamento das datas do relatório',
          details: dateError instanceof Error ? dateError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 400 }
      )
    }

    // ========== ETAPA 4: BUSCAR DADOS DO ESTABELECIMENTO ==========
    let establishment
    try {
      console.log(`🔍 [${requestId}] Buscando dados do estabelecimento...`)
      establishment = await prisma.tenant.findUnique({
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

      console.log(`🏢 [${requestId}] Estabelecimento encontrado:`, establishment ? establishment.businessName || establishment.name : 'Não encontrado')

      if (!establishment) {
        console.log(`❌ [${requestId}] Estabelecimento não encontrado para tenantId:`, authUser.tenantId)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Estabelecimento não encontrado',
            timestamp: new Date().toISOString(),
            requestId 
          }, 
          { status: 404 }
        )
      }
    } catch (establishmentError) {
      console.error(`❌ [${requestId}] Erro ao buscar estabelecimento:`, establishmentError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao acessar dados do estabelecimento',
          details: establishmentError instanceof Error ? establishmentError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 500 }
      )
    }

    // ========== ETAPA 5: BUSCAR AGENDAMENTOS PRINCIPAIS ==========
    let appointments: any[] = []
    try {
      console.log(`🔍 [${requestId}] Buscando agendamentos concluídos...`)
      console.log(`📋 [${requestId}] Filtros da query:`, {
        tenantId: authUser.tenantId,
        status: 'COMPLETED',
        dateFilter
      })

      appointments = await prisma.appointment.findMany({
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
        orderBy: { createdAt: 'desc' },
        take: 1000 // Limitar para evitar timeout
      })

      console.log(`📊 [${requestId}] Agendamentos encontrados:`, appointments.length)
      if (appointments.length > 0) {
        console.log(`💰 [${requestId}] Amostra dos primeiros 3:`, appointments.slice(0, 3).map(app => ({
          id: app.id,
          totalPrice: app.totalPrice,
          createdAt: app.createdAt?.toISOString(),
          endUser: app.endUser?.name
        })))
      }
    } catch (appointmentsError) {
      console.error(`❌ [${requestId}] Erro ao buscar agendamentos:`, appointmentsError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao acessar dados dos agendamentos',
          details: appointmentsError instanceof Error ? appointmentsError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 500 }
      )
    }

    // ========== ETAPA 6: CÁLCULOS FINANCEIROS SEGUROS ==========
    let totalRevenue = 0
    let totalAppointments = 0
    let averageTicket = 0
    let conversionRate = 0
    let financialSummary: any = null

    try {
      console.log(`💰 [${requestId}] Calculando resumo financeiro...`)
      
      financialSummary = await prisma.appointment.aggregate({
        _sum: { totalPrice: true },
        _count: { id: true },
        where: {
          tenantId: authUser.tenantId,
          status: 'COMPLETED',
          ...dateFilter
        }
      })

      totalRevenue = Number(financialSummary._sum.totalPrice || 0)
      totalAppointments = Number(financialSummary._count.id || 0)
      averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0

      // Calcular taxa de conversão (agendamentos concluídos vs total)
      const totalAllAppointments = await prisma.appointment.count({
        where: {
          tenantId: authUser.tenantId,
          ...dateFilter
        }
      })
      conversionRate = totalAllAppointments > 0 ? (totalAppointments / totalAllAppointments) * 100 : 0

      console.log(`📊 [${requestId}] Resumo financeiro:`, {
        totalRevenue,
        totalAppointments,
        averageTicket,
        conversionRate: conversionRate.toFixed(1)
      })
      
    } catch (financialError) {
      console.error(`❌ [${requestId}] Erro nos cálculos financeiros:`, financialError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro nos cálculos financeiros',
          details: financialError instanceof Error ? financialError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 500 }
      )
    }

    // ========== ETAPA 7: PREPARAR TRANSAÇÕES FORMATADAS ==========
    let transactions: any[] = []
    try {
      console.log(`📝 [${requestId}] Formatando transações...`)
      
      transactions = appointments.map((appointment: any) => ({
        date: appointment.createdAt ? formatBrazilDate(appointment.createdAt) : 'Data não disponível',
        time: appointment.createdAt ? 
          appointment.createdAt.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '00:00',
        client: appointment.endUser?.name || 'Cliente não informado',
        professional: appointment.professional?.name || 'Profissional não informado',
        services: appointment.services && Array.isArray(appointment.services) ?
          appointment.services.map((service: any) => service.name || 'Serviço').join(', ') :
          'Serviços não disponíveis',
        amount: Number(appointment.totalPrice || 0),
        method: appointment.paymentMethod || 'Não informado'
      }))

      console.log(`📝 [${requestId}] Transações formatadas:`, transactions.length)
      
    } catch (transactionError) {
      console.error(`❌ [${requestId}] Erro ao formatar transações:`, transactionError)
      // Não falhar por isso, apenas usar array vazio
      transactions = []
    }

    // ========== ETAPA 8: ANÁLISE POR SERVIÇO ==========
    let revenueByService: any[] = []
    try {
      console.log(`🎯 [${requestId}] Calculando receita por serviço...`)
      
      const serviceRevenue = new Map<string, { total: number; count: number }>()
      appointments.forEach((appointment: any) => {
        if (appointment.services && Array.isArray(appointment.services)) {
          appointment.services.forEach((service: any) => {
            const serviceName = service.name || 'Serviço não identificado'
            const servicePrice = Number(service.price) || 0
            const current = serviceRevenue.get(serviceName) || { total: 0, count: 0 }
            serviceRevenue.set(serviceName, {
              total: current.total + servicePrice,
              count: current.count + 1
            })
          })
        }
      })

      revenueByService = Array.from(serviceRevenue.entries())
        .map(([service, data]) => ({
          serviceName: service,
          total: data.total,
          count: data.count,
          percentage: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0'
        }))
        .sort((a, b) => b.total - a.total)

      console.log(`🎯 [${requestId}] Serviços analisados:`, revenueByService.length)
      
    } catch (serviceError) {
      console.error(`❌ [${requestId}] Erro na análise por serviço:`, serviceError)
      revenueByService = []
    }

    // ========== ETAPA 9: ANÁLISE POR PROFISSIONAL ==========
    let revenueByProfessional: any[] = []
    try {
      console.log(`👨‍💼 [${requestId}] Calculando receita por profissional...`)
      
      const professionalRevenue = new Map<string, { total: number; count: number }>()
      appointments.forEach((appointment: any) => {
        const professionalName = appointment.professional?.name || 'Não informado'
        const appointmentPrice = Number(appointment.totalPrice) || 0
        const current = professionalRevenue.get(professionalName) || { total: 0, count: 0 }
        professionalRevenue.set(professionalName, {
          total: current.total + appointmentPrice,
          count: current.count + 1
        })
      })

      revenueByProfessional = Array.from(professionalRevenue.entries())
        .map(([professional, data]) => ({
          professionalName: professional,
          total: data.total,
          count: data.count,
          percentage: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0'
        }))
        .sort((a, b) => b.total - a.total)

      console.log(`👨‍💼 [${requestId}] Profissionais analisados:`, revenueByProfessional.length)
      
    } catch (professionalError) {
      console.error(`❌ [${requestId}] Erro na análise por profissional:`, professionalError)
      revenueByProfessional = []
    }

    // ========== ETAPA 10: RECEITA DIÁRIA DOS ÚLTIMOS 30 DIAS ==========
    let dailyRevenueStats: any = {
      total: 0,
      average: 0,
      best: 0,
      bestDate: '',
      data: []
    }
    
    try {
      console.log(`📅 [${requestId}] Calculando receita diária dos últimos 30 dias...`)
      
      const now = new Date()
      const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      const last30Days: Array<{
        date: string;
        revenue: number;
        appointmentCount: number;
      }> = []
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(currentDay)
        date.setDate(currentDay.getDate() - i)
        const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000)

        try {
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
            appointmentCount: Number(dayRevenue._count.id || 0)
          })
        } catch (dayError) {
          console.error(`⚠️ [${requestId}] Erro no dia ${formatBrazilDate(date)}:`, dayError)
          last30Days.push({
            date: formatBrazilDate(date),
            revenue: 0,
            appointmentCount: 0
          })
        }
      }

      dailyRevenueStats = {
        total: last30Days.reduce((sum, day) => sum + day.revenue, 0),
        average: last30Days.reduce((sum, day) => sum + day.revenue, 0) / 30,
        best: Math.max(...last30Days.map(day => day.revenue)),
        bestDate: last30Days.find(day => day.revenue === Math.max(...last30Days.map(d => d.revenue)))?.date || '',
        data: last30Days
      }

      console.log(`📅 [${requestId}] Receita diária calculada - Total: ${dailyRevenueStats.total}, Média: ${dailyRevenueStats.average.toFixed(2)}`)
      
    } catch (dailyError) {
      console.error(`❌ [${requestId}] Erro no cálculo de receita diária:`, dailyError)
      // Manter valores padrão vazios
    }

    // ========== ETAPA 11: ANÁLISE DE MÉTODOS DE PAGAMENTO ==========
    let paymentMethodsStats: any[] = []
    try {
      console.log(`💳 [${requestId}] Analisando métodos de pagamento...`)
      
      const paymentMethods = new Map<string, { count: number; amount: number }>()
      appointments.forEach((appointment: any) => {
        const method = appointment.paymentMethod || 'Não informado'
        const amount = Number(appointment.totalPrice) || 0
        const current = paymentMethods.get(method) || { count: 0, amount: 0 }
        paymentMethods.set(method, {
          count: current.count + 1,
          amount: current.amount + amount
        })
      })

      paymentMethodsStats = Array.from(paymentMethods.entries())
        .map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount,
          percentage: totalAppointments > 0 ? ((data.count / totalAppointments) * 100).toFixed(1) : '0'
        }))
        .sort((a, b) => b.amount - a.amount)

      console.log(`💳 [${requestId}] Métodos de pagamento analisados:`, paymentMethodsStats.length)
      
    } catch (paymentError) {
      console.error(`❌ [${requestId}] Erro na análise de métodos de pagamento:`, paymentError)
      paymentMethodsStats = []
    }

    // ========== ETAPA 12: MONTAR RESPOSTA FINAL ==========
    try {
      console.log(`📋 [${requestId}] Montando resposta final...`)
      
      const reportData = {
        success: true,
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
        paymentMethods: paymentMethodsStats,
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }

      console.log(`✅ [${requestId}] Relatório gerado com sucesso em ${Date.now() - startTime}ms`)
      console.log(`📊 [${requestId}] Resumo final:`, {
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
      
    } catch (responseError) {
      console.error(`❌ [${requestId}] Erro ao montar resposta final:`, responseError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao finalizar relatório',
          details: responseError instanceof Error ? responseError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          requestId 
        }, 
        { status: 500 }
      )
    }

  } catch (error) {
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    console.error(`💥 [${requestId}] ERRO CRÍTICO na geração do relatório financeiro:`)
    console.error(`⏱️ [${requestId}] Tempo de processamento antes do erro: ${processingTime}ms`)
    console.error(`📅 [${requestId}] Timestamp do erro: ${new Date().toISOString()}`)
    console.error(`🔍 [${requestId}] Tipo do erro:`, typeof error)
    console.error(`📄 [${requestId}] Mensagem do erro:`, error instanceof Error ? error.message : String(error))
    console.error(`📚 [${requestId}] Stack trace completo:`, error instanceof Error ? error.stack : 'Stack trace não disponível')
    
    // Log dos parâmetros para debug
    console.error(`🔧 [${requestId}] Parâmetros da requisição:`)
    console.error(`   - URL:`, request.url)
    console.error(`   - Period:`, new URL(request.url).searchParams.get('period'))
    console.error(`   - Headers Authorization:`, request.headers.get('authorization') ? 'Presente' : 'Ausente')
    
    if (error instanceof Error) {
      // ========== TRATAMENTO DE ERROS ESPECÍFICOS ==========
      
      // Erros de banco de dados
      if (error.message.includes('prisma') || 
          error.message.includes('database') || 
          error.message.includes('connection') ||
          error.message.includes('timeout')) {
        console.error(`🔴 [${requestId}] ERRO DE BANCO DE DADOS detectado`)
        return NextResponse.json(
          { 
            success: false,
            error: 'Erro de conexão com banco de dados',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Falha na conexão com o banco de dados. Tente novamente.',
            timestamp: new Date().toISOString(),
            requestId,
            code: 'DATABASE_ERROR',
            processingTime
          },
          { status: 500 }
        )
      }
      
      // Erros de autenticação
      if (error.message.includes('token') || 
          error.message.includes('jwt') || 
          error.message.includes('auth') ||
          error.message.includes('unauthorized')) {
        console.error(`🔴 [${requestId}] ERRO DE AUTENTICAÇÃO detectado`)
        return NextResponse.json(
          { 
            success: false,
            error: 'Erro de autenticação',
            details: 'Token inválido ou expirado. Faça login novamente.',
            timestamp: new Date().toISOString(),
            requestId,
            code: 'AUTH_ERROR',
            processingTime
          },
          { status: 401 }
        )
      }

      // Erros de validação de dados
      if (error.message.includes('validation') || 
          error.message.includes('invalid') ||
          error.message.includes('required')) {
        console.error(`🔴 [${requestId}] ERRO DE VALIDAÇÃO detectado`)
        return NextResponse.json(
          { 
            success: false,
            error: 'Erro de validação de dados',
            details: error.message,
            timestamp: new Date().toISOString(),
            requestId,
            code: 'VALIDATION_ERROR',
            processingTime
          },
          { status: 400 }
        )
      }

      // Erros de tenant/business
      if (error.message.includes('tenant') || 
          error.message.includes('business') ||
          error.message.includes('establishment')) {
        console.error(`🔴 [${requestId}] ERRO DE TENANT/BUSINESS detectado`)
        return NextResponse.json(
          { 
            success: false,
            error: 'Negócio não encontrado',
            details: 'Verifique se sua conta tem acesso a este negócio',
            timestamp: new Date().toISOString(),
            requestId,
            code: 'BUSINESS_NOT_FOUND',
            processingTime
          },
          { status: 404 }
        )
      }
    }

    // ========== ERRO GENÉRICO FINAL ==========
    console.error(`🔴 [${requestId}] ERRO GENÉRICO - Classificação não identificada`)
    console.error(`📋 [${requestId}] Informações para suporte:`, {
      requestId,
      timestamp: new Date().toISOString(),
      processingTime,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Ocorreu um erro interno ao processar o relatório financeiro',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? `${error.message}\n\nStack: ${error.stack}` : String(error)) : 
          'Erro interno do servidor. Entre em contato com o suporte técnico.',
        timestamp: new Date().toISOString(),
        requestId,
        code: 'INTERNAL_SERVER_ERROR',
        processingTime,
        supportInfo: {
          message: 'Inclua este requestId ao entrar em contato com o suporte',
          requestId
        }
      },
      { status: 500 }
    )
  }
}
