import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { utcToBrazil, getBrazilNow } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
  const user = verifyToken(request)
    
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const monthFilter = searchParams.get('month')
    const yearFilter = searchParams.get('year')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    let professionalId = searchParams.get('professionalId') || undefined

    // Restrição: colaborador só pode ver seus próprios dados
    const isCollaborator = user.role === 'COLLABORATOR'
    if (isCollaborator) {
      professionalId = user.professionalId
    }

    // 🇧🇷 Usar timezone brasileiro para cálculos
    const nowBrazil = getBrazilNow()
    const currentMonth = monthFilter ? parseInt(monthFilter) - 1 : nowBrazil.getMonth()
    const currentYear = yearFilter ? parseInt(yearFilter) : nowBrazil.getFullYear()

    // Parser local (YYYY-MM-DD) para início/fim do dia no Brasil
    const parseLocal = (dateStr: string, endOfDay = false) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    }

    // Intervalo selecionado (se fornecido)
    const rangeStart = from ? parseLocal(from, false) : undefined
    const rangeEnd = to ? parseLocal(to, true) : (from ? parseLocal(from, true) : undefined)

    // Calcular início e fim do mês no timezone brasileiro (fallback)
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Calcular mês anterior para comparação
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthStart = new Date(lastMonthYear, lastMonth, 1)
    const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999)

    switch (reportType) {
      case 'overview':
        return await getOverviewReport(user.tenantId, {
          // range customizado (tem prioridade)
          rangeStart,
          rangeEnd,
          // fallback mensal
          monthStart,
          monthEnd,
          lastMonthStart,
          lastMonthEnd,
          currentMonth,
          currentYear,
          professionalId,
          isCollaborator,
        })
      
      case 'monthly-performance':
  return await getMonthlyPerformance(user.tenantId, professionalId, rangeStart, rangeEnd, isCollaborator)
      
    case 'services':
  return await getServicesReport(user.tenantId, rangeStart || monthStart, rangeEnd || monthEnd, professionalId, isCollaborator)
      
      case 'professionals':
  return await getProfessionalsReport(user.tenantId, rangeStart || monthStart, rangeEnd || monthEnd, professionalId, isCollaborator)
      
      case 'time-analysis':
  return await getTimeAnalysisReport(user.tenantId, rangeStart || monthStart, rangeEnd || monthEnd, professionalId)
      
      case 'profitability':
        return await getProfitabilityReport(user.tenantId, {
          rangeStart: rangeStart || monthStart,
          rangeEnd: rangeEnd || monthEnd,
          professionalId,
          isCollaborator
        })
      
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Relatório geral com métricas principais
async function getOverviewReport(tenantId: string, params: any) {
  const { rangeStart, rangeEnd, monthStart, monthEnd, lastMonthStart, lastMonthEnd, professionalId, isCollaborator } = params

  // 1. Buscar agendamentos do período atual e anterior
  const currentWhere: any = {
    tenantId,
    dateTime: rangeStart && rangeEnd ? { gte: rangeStart, lte: rangeEnd } : { gte: monthStart, lte: monthEnd }
  }
  if (professionalId && professionalId !== 'all') currentWhere.professionalId = professionalId

  // período anterior baseado no range (mesma duração imediatamente anterior) ou mês anterior
  let prevStart = lastMonthStart
  let prevEnd = lastMonthEnd
  if (rangeStart && rangeEnd) {
    const durationMs = rangeEnd.getTime() - rangeStart.getTime()
    prevEnd = new Date(rangeStart.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - durationMs)
  }
  const previousWhere: any = {
    tenantId,
    dateTime: { gte: prevStart, lte: prevEnd }
  }
  if (professionalId && professionalId !== 'all') previousWhere.professionalId = professionalId

  const [thisMonthAppointments, lastMonthAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: currentWhere,
      include: {
        services: true,
        endUser: true,
        professional: true
      }
    }),
    prisma.appointment.findMany({
      where: previousWhere,
      include: {
        services: true,
        endUser: true
      }
    })
  ])

  // 2. Filtrar apenas agendamentos concluídos/em andamento para faturamento
  const completedThisMonth = thisMonthAppointments.filter(apt => 
    apt.status === 'COMPLETED' || apt.status === 'IN_PROGRESS'
  )
  const completedLastMonth = lastMonthAppointments.filter(apt => 
    apt.status === 'COMPLETED' || apt.status === 'IN_PROGRESS'
  )

  // 3. Calcular faturamento (usar totalPrice dos agendamentos ou somar preços dos serviços)
  const thisMonthRevenueRaw = completedThisMonth.reduce((sum, apt) => {
    return sum + Number(apt.totalPrice || 0)
  }, 0)
  // Soma de comissão (snapshot)
  const thisMonthCommission = completedThisMonth.reduce((sum, apt) => {
    return sum + Number(apt.commissionEarned || 0)
  }, 0)

  // Se usuário é colaborador, a métrica principal de "revenue" vira sua comissão
  const thisMonthRevenue = isCollaborator ? thisMonthCommission : thisMonthRevenueRaw

  const lastMonthRevenueRaw = completedLastMonth.reduce((sum, apt) => {
    return sum + Number(apt.totalPrice || 0)
  }, 0)
  const lastMonthCommission = completedLastMonth.reduce((sum, apt) => {
    return sum + Number(apt.commissionEarned || 0)
  }, 0)
  const lastMonthRevenue = isCollaborator ? lastMonthCommission : lastMonthRevenueRaw

  // 4. Contagem de agendamentos (todos os status exceto CANCELLED)
  const thisMonthAppointmentsCount = thisMonthAppointments.filter(apt => 
    apt.status !== 'CANCELLED'
  ).length

  const lastMonthAppointmentsCount = lastMonthAppointments.filter(apt => 
    apt.status !== 'CANCELLED'
  ).length

  // 5. Calcular novos clientes (primeiro agendamento no mês atual)
  const allPreviousAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      dateTime: {
        lt: monthStart
      }
    },
    select: {
      endUserId: true
    }
  })

  const existingClientIds = new Set(allPreviousAppointments.map(apt => apt.endUserId))
  const newClientsThisMonth = new Set(
    thisMonthAppointments
      .filter(apt => !existingClientIds.has(apt.endUserId))
      .map(apt => apt.endUserId)
  ).size

  // Calcular novos clientes do mês anterior para comparação
  const allPreviousToLastMonth = await prisma.appointment.findMany({
    where: {
      tenantId,
      dateTime: {
        lt: lastMonthStart
      }
    },
    select: {
      endUserId: true
    }
  })

  const existingClientIdsLastMonth = new Set(allPreviousToLastMonth.map(apt => apt.endUserId))
  const newClientsLastMonth = new Set(
    lastMonthAppointments
      .filter(apt => !existingClientIdsLastMonth.has(apt.endUserId))
      .map(apt => apt.endUserId)
  ).size

  // 6. Calcular ticket médio
  const thisMonthTicket = completedThisMonth.length > 0 ? (isCollaborator ? thisMonthCommission : thisMonthRevenueRaw) / completedThisMonth.length : 0
  const lastMonthTicket = completedLastMonth.length > 0 ? (isCollaborator ? lastMonthCommission : lastMonthRevenueRaw) / completedLastMonth.length : 0

  // 7. Função para calcular mudança percentual
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%"
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${Math.round(change)}%`
  }

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        revenue: {
          current: thisMonthRevenue,
          previous: lastMonthRevenue,
          change: calculateChange(thisMonthRevenue, lastMonthRevenue),
          gross: thisMonthRevenueRaw,
          grossPrevious: lastMonthRevenueRaw,
          commission: thisMonthCommission,
          commissionPrevious: lastMonthCommission
        },
        totalCommissions: thisMonthCommission,
        appointments: {
          current: thisMonthAppointmentsCount,
          previous: lastMonthAppointmentsCount,
          change: calculateChange(thisMonthAppointmentsCount, lastMonthAppointmentsCount)
        },
        newClients: {
          current: newClientsThisMonth,
          previous: newClientsLastMonth,
          change: calculateChange(newClientsThisMonth, newClientsLastMonth)
        },
        averageTicket: {
          current: thisMonthTicket,
          previous: lastMonthTicket,
          change: calculateChange(thisMonthTicket, lastMonthTicket)
        }
      }
    }
  })
}

// Performance mensal dos últimos 6 meses
async function getMonthlyPerformance(tenantId: string, professionalId?: string, rangeStart?: Date, rangeEnd?: Date, isCollaborator: boolean = false) {
  const monthlyData = []
  
  if (rangeStart && rangeEnd) {
    // Quando há intervalo customizado, retornar um único bucket "Período"
    const where: any = {
      tenantId,
      dateTime: { gte: rangeStart, lte: rangeEnd },
      status: { in: ['COMPLETED', 'IN_PROGRESS'] }
    }
    if (professionalId && professionalId !== 'all') where.professionalId = professionalId
  const appointments = await prisma.appointment.findMany({ where })
  const grossRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
    const commission = appointments.reduce((sum, apt) => sum + Number(apt.commissionEarned || 0), 0)
  const revenue = isCollaborator ? commission : grossRevenue
    const uniqueClients = new Set(appointments.map(apt => apt.endUserId)).size
    monthlyData.push({ month: 'Período', year: new Date().getFullYear(), revenue, grossRevenue, commission, appointments: appointments.length, clients: uniqueClients })
  } else {
    // Buscar dados dos últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date()
      targetDate.setMonth(targetDate.getMonth() - i)
      
      const month = targetDate.getMonth()
      const year = targetDate.getFullYear()
      
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
      
      const where: any = {
        tenantId,
        dateTime: { gte: monthStart, lte: monthEnd },
        status: { in: ['COMPLETED', 'IN_PROGRESS'] }
      }
      if (professionalId && professionalId !== 'all') where.professionalId = professionalId
  const appointments = await prisma.appointment.findMany({ where })

  const grossRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
    const commission = appointments.reduce((sum, apt) => sum + Number(apt.commissionEarned || 0), 0)
    const revenue = isCollaborator ? commission : grossRevenue
      const uniqueClients = new Set(appointments.map(apt => apt.endUserId)).size
      
      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ]
      
      monthlyData.push({
        month: monthNames[month],
        year,
        revenue,
        grossRevenue,
        commission,
        appointments: appointments.length,
        clients: uniqueClients
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      monthlyPerformance: monthlyData
    }
  })
}

// Relatório de serviços mais populares
async function getServicesReport(tenantId: string, start: Date, end: Date, professionalId?: string, isCollaborator: boolean = false) {
  // Buscar agendamentos do período com serviços
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
  dateTime: { gte: start, lte: end },
      status: {
        notIn: ['CANCELLED']
  },
  ...(professionalId && professionalId !== 'all' ? { professionalId } : {})
    },
    include: {
      services: true,
      professional: true
    }
  })

  // Agrupar serviços por popularidade
  const serviceStats = new Map()
  
  appointments.forEach(appointment => {
    // Incrementar popularidade (contagem) para todos os agendamentos não cancelados
    appointment.services.forEach(service => {
      const key = service.id
      if (!serviceStats.has(key)) {
        serviceStats.set(key, {
          id: service.id,
          name: service.name,
          count: 0,
          revenue: 0,
          price: Number(service.price)
        })
      }
      const stats = serviceStats.get(key)
      stats.count += 1
    })

    // Para receita/ganhos, considerar apenas COMPLETED/IN_PROGRESS
    if (appointment.status === 'COMPLETED' || appointment.status === 'IN_PROGRESS') {
      if (!isCollaborator) {
        // OWNER: receita bruta por serviço (somar preço de tabela)
        appointment.services.forEach(service => {
          const stats = serviceStats.get(service.id)
          stats.revenue += Number(service.price)
        })
      } else {
        // COLLABORATOR: distribuir a comissão do agendamento proporcionalmente ao preço do serviço
        const commissionSnapshot = Number(appointment.commissionEarned || 0)
        let commission = commissionSnapshot
        if (!commission || commission <= 0) {
          const pct = Number(appointment.professional?.commissionPercentage || 0)
          const aptTotal = Number(appointment.totalPrice || 0)
          const fallbackTotal = appointment.services.reduce((s, sv) => s + Number(sv.price || 0), 0)
          const base = aptTotal > 0 ? aptTotal : fallbackTotal
          commission = base * pct
        }

        const totalServicesPrice = appointment.services.reduce((sum, s) => sum + Number(s.price || 0), 0)
        const divisor = totalServicesPrice > 0 ? totalServicesPrice : appointment.services.length || 1

        appointment.services.forEach(service => {
          const stats = serviceStats.get(service.id)
          const weight = totalServicesPrice > 0 ? (Number(service.price || 0) / divisor) : (1 / divisor)
          stats.revenue += commission * weight
        })
      }
    }
  })

  // Converter para array e ordenar por quantidade
  const topServices = Array.from(serviceStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 serviços
    .map(service => ({
      ...service,
      growth: "+0%" // TODO: Calcular crescimento vs mês anterior
    }))

  return NextResponse.json({
    success: true,
    data: {
      topServices
    }
  })
}

// Relatório de performance dos profissionais
async function getProfessionalsReport(tenantId: string, monthStart: Date, monthEnd: Date, professionalId?: string, isCollaborator: boolean = false) {
  // Calcular período anterior para comparação
  const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
  const lastMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0, 23, 59, 59, 999)
  // Se professionalId foi forçado (colaborador), buscar apenas esse profissional
  const professionals = await prisma.professional.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(professionalId && professionalId !== 'all' ? { id: professionalId } : {})
    },
    include: {
      appointments: {
        where: {
          dateTime: {
            gte: lastMonthStart,
            lte: monthEnd
          },
          status: { notIn: ['CANCELLED'] }
        }
      }
    }
  })

  const professionalPerformance = professionals.map(professional => {
    // Filtrar agendamentos do mês atual
    const currentMonthAppointments = professional.appointments.filter(apt => 
      apt.dateTime >= monthStart && apt.dateTime <= monthEnd
    )
    
    // Filtrar agendamentos do mês anterior
    const lastMonthAppointments = professional.appointments.filter(apt => 
      apt.dateTime >= lastMonthStart && apt.dateTime <= lastMonthEnd
    )
    
    const completedCurrentMonth = currentMonthAppointments.filter(apt => 
      apt.status === 'COMPLETED' || apt.status === 'IN_PROGRESS'
    )
    
    const completedLastMonth = lastMonthAppointments.filter(apt => 
      apt.status === 'COMPLETED' || apt.status === 'IN_PROGRESS'
    )
    
  const currentRevenueRaw = completedCurrentMonth.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
  const lastMonthRevenueRaw = completedLastMonth.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
  const currentCommission = completedCurrentMonth.reduce((sum, apt) => sum + Number(apt.commissionEarned || 0), 0)
  const lastMonthCommission = completedLastMonth.reduce((sum, apt) => sum + Number(apt.commissionEarned || 0), 0)
  // Para colaboradores (quando professionalId filtrado) destacar comissão como receita
  const useCommission = isCollaborator || (professionalId && professionalId !== 'all') ? true : false
  const currentRevenue = useCommission && currentCommission > 0 ? currentCommission : currentRevenueRaw
  const lastMonthRevenue = useCommission && lastMonthCommission > 0 ? lastMonthCommission : lastMonthRevenueRaw
    
    // Calcular crescimento
    let growth = "+0%"
    if (lastMonthRevenue > 0) {
      const growthPercent = ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      const sign = growthPercent >= 0 ? "+" : ""
      growth = `${sign}${Math.round(growthPercent)}%`
    } else if (currentRevenue > 0) {
      growth = "+100%"
    }
    
    // ✅ CORREÇÃO: Usar apenas agendamentos concluídos/em andamento para o contador
    // Isso garante consistência com o cálculo de receita - antes estava contando todos os agendamentos
    const appointmentsCount = completedCurrentMonth.length
    
    return {
      id: professional.id,
      name: professional.name,
      avatar: professional.avatar,
      appointments: appointmentsCount,
  revenue: currentRevenue.toFixed(2),
  grossRevenue: currentRevenueRaw.toFixed(2),
  commission: currentCommission.toFixed(2),
      rating: "4.8", // TODO: Implementar sistema de avaliações
      growth: growth
    }
  })

  // Ordenar por faturamento decrescente somente se múltiplos (OWNER)
  if (professionalPerformance.length > 1) {
    professionalPerformance.sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
  }

  return NextResponse.json({
    success: true,
    data: {
      professionalPerformance
    }
  })
}

// Análise de horários
async function getTimeAnalysisReport(tenantId: string, monthStart: Date, monthEnd: Date, professionalId?: string) {
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      dateTime: {
        gte: monthStart,
        lte: monthEnd
      },
      status: {
        notIn: ['CANCELLED']
  },
  ...(professionalId && professionalId !== 'all' ? { professionalId } : {})
    }
  })

  // Definir períodos
  const timeSlots = [
    { period: "Manhã", time: "08:00 - 12:00", startHour: 8, endHour: 12, isWeekend: false },
    { period: "Tarde", time: "12:00 - 18:00", startHour: 12, endHour: 18, isWeekend: false },
    { period: "Noite", time: "18:00 - 20:00", startHour: 18, endHour: 20, isWeekend: false },
    { period: "Sábado", time: "08:00 - 17:00", startHour: 8, endHour: 17, isWeekend: true },
  ]

  const timeAnalysis = timeSlots.map(slot => {
    let filteredAppointments = appointments

    // 🇧🇷 Filtrar por fim de semana/dias úteis usando timezone brasileiro
    if (slot.isWeekend) {
      filteredAppointments = appointments.filter(apt => {
        const aptDateBrazil = utcToBrazil(apt.dateTime)
        return aptDateBrazil.getDay() === 6 // Sábado
      })
    } else {
      filteredAppointments = appointments.filter(apt => {
        const aptDateBrazil = utcToBrazil(apt.dateTime)
        const dayOfWeek = aptDateBrazil.getDay()
        return dayOfWeek >= 1 && dayOfWeek <= 5 // Segunda a sexta
      })
    }

    // Filtrar por horário
    const slotAppointments = filteredAppointments.filter(apt => {
      const aptDateBrazil = utcToBrazil(apt.dateTime)
      const hour = aptDateBrazil.getHours()
      return hour >= slot.startHour && hour < slot.endHour
    })

    // Calcular ocupação (estimativa simples)
    const totalHours = slot.endHour - slot.startHour
    const slotsPerHour = 2 // 30 min cada slot
    const totalSlots = totalHours * slotsPerHour
    const daysInPeriod = slot.isWeekend ? 4 : 22 // ~4 sábados ou ~22 dias úteis por mês
    const totalSlotsInMonth = totalSlots * daysInPeriod
    const occupancy = totalSlotsInMonth > 0 ? Math.min(100, Math.round((slotAppointments.length / totalSlotsInMonth) * 100)) : 0

    return {
      period: slot.period,
      time: slot.time,
      occupancy,
      appointments: slotAppointments.length
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      timeAnalysis
    }
  })
}

// Novo: Relatório de Lucratividade do Período
async function getProfitabilityReport(tenantId: string, params: { rangeStart: Date, rangeEnd: Date, professionalId?: string, isCollaborator?: boolean }) {
  const { rangeStart, rangeEnd, professionalId, isCollaborator } = params
  const where: any = {
    tenantId,
    dateTime: { gte: rangeStart, lte: rangeEnd },
    status: { in: ['COMPLETED', 'IN_PROGRESS'] }
  }
  if (professionalId && professionalId !== 'all') where.professionalId = professionalId

  const appointments = await prisma.appointment.findMany({ where, include: { professional: true } })

  const grossRevenue = appointments.reduce((sum, apt) => sum + Number(apt.totalPrice || 0), 0)
  const totalDiscounts = appointments.reduce((sum, apt) => sum + Number((apt as any).discountApplied || 0), 0)
  const netRevenueOwner = grossRevenue - totalDiscounts
  const totalCommissions = appointments.reduce((sum, apt) => sum + Number(apt.commissionEarned || 0), 0)

  // Custos fixos do tenant (Tenant.fixedCosts em JSON) - tentar buscar e distribuir pelo período
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { fixedCosts: true } })
  let fixedCosts = 0
  try {
    const list = Array.isArray(tenant?.fixedCosts) ? (tenant?.fixedCosts as any[]) : []
    // Regra: somar apenas os RECURRING; e ONE_TIME do mês do intervalo (se rangeStart.month == item.month && rangeStart.year == item.year)
    const rs = new Date(rangeStart)
    const year = rs.getFullYear()
    const month = rs.getMonth() // 0-11
    for (const item of list) {
      const recurrence = item?.recurrence === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING'
      const amount = Number(item?.amount || 0)
      if (!isNaN(amount) && amount > 0) {
        if (recurrence === 'RECURRING') fixedCosts += amount
        else if (recurrence === 'ONE_TIME') {
          if (typeof item?.year === 'number' && typeof item?.month === 'number') {
            if (item.year === year && item.month === month) fixedCosts += amount
          }
        }
      }
    }
  } catch {}

  // OWNER: lucro líquido = receita líquida - comissões - custos fixos
  // COLLABORATOR: perspectiva de ganhos do colaborador (sem custos fixos do negócio)
  const netProfitOwner = netRevenueOwner - totalCommissions - fixedCosts
  const collaboratorEarnings = totalCommissions // soma das comissões no período

  return NextResponse.json({
    success: true,
    data: {
      profitability: {
        grossRevenue,
        totalDiscounts,
        netRevenue: netRevenueOwner,
        totalCommissions,
        fixedCosts,
        netProfit: isCollaborator ? collaboratorEarnings : netProfitOwner,
        perspective: isCollaborator ? 'COLLABORATOR' : 'OWNER'
      }
    }
  })
}
