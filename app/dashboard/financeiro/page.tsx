"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, Banknote, Download, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react"
import { useDashboard, useAppointments } from "@/hooks/use-api"
import { utcToBrazil, getBrazilNow, getBrazilDayOfWeek, formatBrazilDate } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { ExportModal } from "@/components/ui/export-modal"
import { generatePDFReport, generateExcelReport } from "@/lib/report-generator"
import { ExportModal as NewExportModal } from "@/components/export-modal"

export default function FinanceiroPage() {
  const [period, setPeriod] = useState('today')
  const brazilNow = getBrazilNow()
  const [selectedMonth, setSelectedMonth] = useState(utcToBrazil(brazilNow).getMonth())
  const [selectedYear, setSelectedYear] = useState(utcToBrazil(brazilNow).getFullYear())
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const { dashboardData, loading, fetchDashboardData } = useDashboard()
  const { appointments, fetchAppointments } = useAppointments()

  useEffect(() => {
    fetchDashboardData(period)
    fetchAppointments() // Buscar todos os agendamentos para transações
  }, [period, fetchDashboardData, fetchAppointments])

  // ✅ OTIMIZAÇÃO: Usar useMemo para filtros pesados
  const completedAppointments = useMemo(() => 
    appointments.filter(app => 
      app.status === 'COMPLETED' && 
      app.totalPrice > 0 && 
      app.dateTime &&
      utcToBrazil(new Date(app.dateTime)) <= getBrazilNow() // Apenas agendamentos já realizados
    ), [appointments]
  )
  
  // Função para filtrar agendamentos por mês/ano
  const getAppointmentsByMonth = (month: number, year: number) => {
    return completedAppointments.filter(app => {
      const appointmentDate = utcToBrazil(new Date(app.dateTime))
      return appointmentDate.getMonth() === month && appointmentDate.getFullYear() === year
    })
  }

  // Função para obter dados dos últimos 12 meses com dados reais
  const getMonthlyData = () => {
    const monthlyData = []
    const currentDate = getBrazilNow()
    
    for (let i = 11; i >= 0; i--) {
      const brazilCurrentDate = utcToBrazil(currentDate)
      const date = new Date(brazilCurrentDate.getFullYear(), brazilCurrentDate.getMonth() - i, 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      // Filtrar agendamentos do mês específico
      const monthAppointments = completedAppointments.filter(app => {
        const appointmentDate = utcToBrazil(new Date(app.dateTime))
        return appointmentDate.getMonth() === month && appointmentDate.getFullYear() === year
      })
      
      // Calcular receita real do mês
      const revenue = monthAppointments.reduce((total, app) => {
        const price = parseFloat(app.totalPrice) || 0
        return total + price
      }, 0)
      
      const appointmentCount = monthAppointments.length
      
      monthlyData.push({
        month,
        year,
        monthName: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        shortName: date.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: Math.round(revenue * 100) / 100, // Arredondar para 2 casas decimais
        appointmentCount,
        appointments: monthAppointments
      })
    }
    
    return monthlyData
  }

  // Função para obter dados dos últimos 30 dias com dados reais
  const getDailyData = () => {
    const dailyData = []
    const currentDate = getBrazilNow()
    
    for (let i = 29; i >= 0; i--) {
      const brazilCurrentDate = utcToBrazil(currentDate)
      const date = new Date(brazilCurrentDate)
      date.setDate(brazilCurrentDate.getDate() - i)
      
      // Filtrar agendamentos do dia específico
      const dayAppointments = completedAppointments.filter(app => {
        const appointmentDate = utcToBrazil(new Date(app.dateTime))
        return appointmentDate.toDateString() === date.toDateString()
      })
      
      // Calcular receita real do dia
      const revenue = dayAppointments.reduce((total, app) => {
        const price = parseFloat(app.totalPrice) || 0
        return total + price
      }, 0)
      
      const appointmentCount = dayAppointments.length
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        fullDate: date.toLocaleDateString('pt-BR'),
        revenue: Math.round(revenue * 100) / 100, // Arredondar para 2 casas decimais
        appointmentCount,
        appointments: dayAppointments
      })
    }
    
    return dailyData
  }

  // ✅ OTIMIZAÇÃO: Usar useMemo para cálculos pesados
  const dailyData = useMemo(() => getDailyData(), [completedAppointments])
  const monthlyData = useMemo(() => getMonthlyData(), [completedAppointments])
  
  const totalDailyRevenue = useMemo(() => 
    dailyData.reduce((total, day) => total + day.revenue, 0), [dailyData]
  )
  const averageDailyRevenue = dailyData.length > 0 ? totalDailyRevenue / dailyData.length : 0
  const maxDailyRevenue = dailyData.length > 0 ? Math.max(...dailyData.map(d => d.revenue)) : 0
  const bestDay = dailyData.find(d => d.revenue === maxDailyRevenue)
  const selectedMonthData = monthlyData.find(m => m.month === selectedMonth && m.year === selectedYear)
  const currentMonthAppointments = selectedMonthData?.appointments || []

  // Função para navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentIndex = monthlyData.findIndex(m => m.month === selectedMonth && m.year === selectedYear)
    if (direction === 'prev' && currentIndex > 0) {
      const prevMonth = monthlyData[currentIndex - 1]
      setSelectedMonth(prevMonth.month)
      setSelectedYear(prevMonth.year)
    } else if (direction === 'next' && currentIndex < monthlyData.length - 1) {
      const nextMonth = monthlyData[currentIndex + 1]
      setSelectedMonth(nextMonth.month)
      setSelectedYear(nextMonth.year)
    }
  }
  
  // ✅ USAR DADOS REAIS: Métodos de pagamento baseados no banco de dados
  const paymentStats = useMemo(() => {
    // Calcular receita total
    const totalRevenue = completedAppointments.reduce((total, app) => {
      const price = parseFloat(app.totalPrice) || 0
      return total + price
    }, 0)

    // Agrupar por método de pagamento do banco de dados
    const paymentGroups = completedAppointments.reduce((groups, app) => {
      // Normalizar o método de pagamento do banco
      let method = app.paymentMethod || 'NULL'
      const price = parseFloat(app.totalPrice) || 0
      
      // Mapear valores do banco para nomes padronizados
      if (method === 'CASH') {
        method = 'Dinheiro'
      } else if (method === 'CARD') {
        method = 'Cartão'
      } else if (method === 'PIX') {
        method = 'PIX'
      } else if (method === 'NULL') {
        method = 'Não informado'
      } else {
        method = 'Outros'
      }
      
      if (!groups[method]) {
        groups[method] = {
          count: 0,
          amount: 0,
          appointments: []
        }
      }
      
      groups[method].count++
      groups[method].amount += price
      groups[method].appointments.push(app)
      
      return groups
    }, {} as Record<string, { count: number; amount: number; appointments: any[] }>)

    // Converter para array com ícones e cores
    const methodConfig = {
      'Dinheiro': { icon: Banknote, color: 'text-green-400', bgColor: 'bg-green-400' },
      'Cartão': { icon: CreditCard, color: 'text-blue-400', bgColor: 'bg-blue-400' },
      'PIX': { icon: DollarSign, color: 'text-purple-400', bgColor: 'bg-purple-400' },
      'Não informado': { icon: HelpCircle, color: 'text-gray-400', bgColor: 'bg-gray-400' },
      'Outros': { icon: DollarSign, color: 'text-orange-400', bgColor: 'bg-orange-400' }
    }

    return Object.entries(paymentGroups).map(([method, data]) => ({
      method,
      icon: methodConfig[method as keyof typeof methodConfig]?.icon || DollarSign,
      color: methodConfig[method as keyof typeof methodConfig]?.color || 'text-gray-400',
      bgColor: methodConfig[method as keyof typeof methodConfig]?.bgColor || 'bg-gray-400',
      count: (data as any).count,
      amount: (data as any).amount,
      percentage: totalRevenue > 0 ? Math.round(((data as any).amount / totalRevenue) * 100) : 0
    })).sort((a, b) => {
      // Colocar "Não informado" sempre por último
      if (a.method === 'Não informado') return 1
      if (b.method === 'Não informado') return -1
      // Para os outros, ordenar por valor decrescente
      return b.amount - a.amount
    })
  }, [completedAppointments])
  
  // Calcular mudanças reais comparando com dados anteriores
  const previousRevenue = dashboardData?.previousStats?.totalRevenue || 0
  const previousCompletedCount = dashboardData?.previousStats?.completedAppointments || 0
  const previousTotalCount = dashboardData?.previousStats?.totalAppointments || 0
  const previousTicketMedio = previousCompletedCount > 0 ? previousRevenue / previousCompletedCount : 0
  
  // Cálculo do ticket médio com dados reais
  const currentTicketMedio = completedAppointments.length > 0 ? 
    completedAppointments.reduce((total, app) => {
      const price = parseFloat(app.totalPrice) || 0
      return total + price
    }, 0) / completedAppointments.length : 0
  
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { change: "Novo", type: "positive" }
    const changePercent = ((current - previous) / previous) * 100
    const sign = changePercent >= 0 ? "+" : ""
    return {
      change: `${sign}${Math.round(changePercent)}%`,
      type: changePercent >= 0 ? "positive" : "negative"
    }
  }
  
  const revenueChange = calculateChange(dashboardData?.stats?.totalRevenue || 0, previousRevenue)
  const completedChange = calculateChange(completedAppointments.length, previousCompletedCount)
  const conversionChange = calculateChange(
    (completedAppointments.length / Math.max(appointments.length, 1)) * 100,
    previousTotalCount > 0 ? (previousCompletedCount / previousTotalCount) * 100 : 0
  )
  const ticketChange = calculateChange(currentTicketMedio, previousTicketMedio)

  // Função para preparar dados do relatório
  const prepareReportData = () => {
    return {
      businessName: "AgendaPro Dashboard", // Você pode pegar isso do contexto do usuário
      userEmail: "usuario@exemplo.com", // Você pode pegar isso do contexto do usuário
      period: period === 'today' ? 'Hoje' : period === 'week' ? 'Esta Semana' : period === 'month' ? 'Este Mês' : period,
      financialStats: financialStats.map(stat => ({
        title: stat.title,
        value: stat.value,
        change: stat.change,
        changeType: stat.changeType
      })),
      dailyRevenue: {
        total: totalDailyRevenue,
        average: averageDailyRevenue,
        best: maxDailyRevenue,
        bestDate: bestDay?.fullDate || 'N/A',
        data: dailyData.map(day => ({
          date: day.date,
          revenue: day.revenue,
          appointmentCount: day.appointmentCount
        }))
      },
      monthlyAnalysis: {
        month: selectedMonthData?.monthName || 'Carregando...',
        revenue: selectedMonthData?.revenue || 0,
        appointments: selectedMonthData?.appointmentCount || 0,
        ticketMedio: selectedMonthData?.appointmentCount ? 
          selectedMonthData.revenue / selectedMonthData.appointmentCount : 0,
        mediaDiaria: selectedMonthData?.appointmentCount ? 
          Math.round(selectedMonthData.appointmentCount / 30) : 0
      },
      recentTransactions: recentTransactions.map(transaction => ({
        client: transaction.client,
        service: transaction.service,
        amount: transaction.amount,
        method: transaction.method,
        time: transaction.time
      })),
      topServices: topServices.map(service => ({
        service: service.service,
        count: service.count,
        revenue: service.revenue,
        percentage: service.percentage
      })),
      paymentMethods: paymentStats.map(payment => ({
        method: payment.method,
        percentage: payment.percentage,
        amount: payment.amount,
        count: payment.count
      }))
    }
  }

  // Função para abrir modal de exportação
  const handleExportReport = () => {
    setExportModalOpen(true)
  }

  // Função para gerar PDF
  const handleExportPDF = async (period?: string, startDate?: string, endDate?: string) => {
    if (period && startDate && endDate) {
      await generatePDFReport(period, startDate, endDate)
    } else {
      await generatePDFReport(period || 'today')
    }
  }

  // Função para gerar Excel
  const handleExportExcel = async (period?: string, startDate?: string, endDate?: string) => {
    if (period && startDate && endDate) {
      await generateExcelReport(period, startDate, endDate)
    } else {
      await generateExcelReport(period || 'today')
    }
  }

  const financialStats = [
    {
      title: "Faturamento Hoje",
      value: dashboardData?.stats?.totalRevenue ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData.stats.totalRevenue) : 
        "R$ 0,00",
      change: revenueChange.change,
      changeType: revenueChange.type,
      icon: DollarSign,
    },
    {
      title: "Agendamentos Concluídos",
      value: completedAppointments.length.toString(),
      change: completedChange.change,
      changeType: completedChange.type,
      icon: TrendingUp,
    },
    {
      title: "Taxa de Conversão",
      value: `${Math.round((completedAppointments.length / Math.max(appointments.length, 1)) * 100)}%`,
      change: conversionChange.change,
      changeType: conversionChange.type,
      icon: Calendar,
    },
    {
      title: "Ticket Médio",
      value: completedAppointments.length > 0 ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentTicketMedio) : "R$ 0,00",
      change: ticketChange.change,
      changeType: ticketChange.type,
      icon: CreditCard,
    },
  ]

  // ✅ IMPLEMENTAR: Transações recentes com dados reais
  const recentTransactions = useMemo(() => {
    const today = getBrazilNow()
    const todayString = today.toDateString()
    
    return completedAppointments
      .filter(app => {
        const appointmentDate = utcToBrazil(new Date(app.dateTime))
        return appointmentDate.toDateString() === todayString
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 10)
      .map(app => {
        // Normalizar método de pagamento
        let paymentMethod = app.paymentMethod || 'NULL'
        if (paymentMethod === 'CASH') {
          paymentMethod = 'Dinheiro'
        } else if (paymentMethod === 'CARD') {
          paymentMethod = 'Cartão'
        } else if (paymentMethod === 'PIX') {
          paymentMethod = 'PIX'
        } else if (paymentMethod === 'NULL') {
          paymentMethod = 'Não informado'
        } else {
          paymentMethod = 'Outros'
        }
        
        return {
          id: app.id,
          client: app.endUser?.name || 'Cliente',
          service: app.services?.[0]?.name || 'Serviço',
          amount: parseFloat(app.totalPrice) || 0,
          method: paymentMethod,
          time: utcToBrazil(new Date(app.dateTime)).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      })
  }, [completedAppointments])

  // ✅ IMPLEMENTAR: Serviços mais vendidos com dados reais
  const topServices = useMemo(() => {
    const serviceStats = new Map()
    
    completedAppointments.forEach(app => {
      app.services?.forEach((service: any) => {
        const serviceName = service.name
        const servicePrice = parseFloat(service.price) || 0
        
        if (serviceStats.has(serviceName)) {
          const existing = serviceStats.get(serviceName)
          serviceStats.set(serviceName, {
            ...existing,
            count: existing.count + 1,
            revenue: existing.revenue + servicePrice
          })
        } else {
          serviceStats.set(serviceName, {
            service: serviceName,
            count: 1,
            revenue: servicePrice
          })
        }
      })
    })
    
    const totalRevenue = Array.from(serviceStats.values())
      .reduce((total, service) => total + service.revenue, 0)
    
    return Array.from(serviceStats.values())
      .map(service => ({
        ...service,
        percentage: totalRevenue > 0 ? Math.round((service.revenue / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count) // Ordenar por quantidade de agendamentos
      .slice(0, 5)
  }, [completedAppointments])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Financeiro</h1>
          <p className="text-[#71717a]">Controle completo das suas finanças</p>
        </div>
        <Button 
          onClick={handleExportReport}
          className="bg-[#10b981] hover:bg-[#059669] text-[#ededed]"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Financial Stats */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {financialStats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#a1a1aa] truncate">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-[#10b981] flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#ededed] mb-1 truncate">{stat.value}</div>
              <p
                className={`text-xs ${stat.changeType === "positive" ? "text-[#10b981]" : "text-red-400"} flex items-center`}
              >
                {stat.changeType === "positive" ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {stat.change} em relação ao período anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Revenue Analysis Card */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#10b981]" />
              <span className="text-base sm:text-lg">Receita Diária</span>
            </div>
            <span className="text-sm sm:text-base text-[#71717a] sm:text-[#a1a1aa]">- Últimos 30 Dias</span>
          </CardTitle>
          <CardDescription className="text-[#71717a] text-sm">
            Acompanhe o faturamento diário e identifique tendências
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <DollarSign className="w-6 h-6 sm:w-6 sm:h-6 text-[#10b981] mx-auto mb-1" />
              <p className="text-lg sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDailyRevenue)}
              </p>
              <p className="text-sm sm:text-sm text-[#71717a]">Total 30 Dias</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <Calendar className="w-6 h-6 sm:w-6 sm:h-6 text-blue-400 mx-auto mb-1" />
              <p className="text-lg sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageDailyRevenue)}
              </p>
              <p className="text-sm sm:text-sm text-[#71717a]">Média Diária</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <TrendingUp className="w-6 h-6 sm:w-6 sm:h-6 text-orange-400 mx-auto mb-1" />
              <p className="text-lg sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxDailyRevenue)}
              </p>
              <p className="text-sm sm:text-sm text-[#71717a]">Melhor Dia</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <Calendar className="w-6 h-6 sm:w-6 sm:h-6 text-purple-400 mx-auto mb-1" />
              <p className="text-lg sm:text-lg font-bold text-[#ededed] truncate">
                {bestDay?.fullDate || 'N/A'}
              </p>
              <p className="text-sm sm:text-sm text-[#71717a]">Data do Melhor Dia</p>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h4 className="text-[#ededed] font-medium text-sm sm:text-base">Gráfico de Receita Diária</h4>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#71717a]">
                <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                <span>Receita do dia</span>
              </div>
            </div>
            
            {/* Mobile Chart - Scrollable horizontal list */}
            <div className="block sm:hidden">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {dailyData.map((day, index) => {
                    const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
                    const isWeekend = getBrazilDayOfWeek(day.date) === 0 || getBrazilDayOfWeek(day.date) === 6
                    
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center min-w-[50px]"
                      >
                        {/* Bar Container */}
                        <div className="w-8 h-24 bg-[#27272a]/30 rounded-t flex items-end relative mb-2">
                          <div
                            className={`w-full transition-all duration-300 rounded-t ${
                              isWeekend 
                                ? 'bg-emerald-400/70' 
                                : 'bg-[#10b981]'
                            }`}
                            style={{ 
                              height: `${height}%`, 
                              minHeight: day.revenue > 0 ? '4px' : '0px' 
                            }}
                          />
                        </div>
                        
                        {/* Day Info */}
                        <div className="text-center">
                          <div className={`text-xs ${isWeekend ? 'text-orange-400' : 'text-[#71717a]'} font-medium mb-1`}>
                            {day.dayName.slice(0, 3)}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {utcToBrazil(new Date(day.date)).getDate()}
                          </div>
                          <div className="text-xs text-[#10b981] font-medium">
                            {day.revenue > 0 ? `R$ ${Math.round(day.revenue)}` : 'R$ 0'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Mobile Legend */}
              <div className="flex flex-col items-center gap-2 text-xs text-[#71717a] pt-3 border-t border-[#52525b]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                    <span>Dias úteis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-400/70 rounded"></div>
                    <span>Fins de semana</span>
                  </div>
                </div>
                <span className="text-center text-gray-500">Deslize para ver todos os dias</span>
              </div>
            </div>

            {/* Desktop Chart - Original layout */}
            <div className="hidden sm:block relative pt-16 pb-4">
              {/* Chart Container */}
              <div className="flex items-end justify-between gap-1 h-32 px-4 relative">
                {dailyData.map((day, index) => {
                  const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
                  const isWeekend = getBrazilDayOfWeek(day.date) === 0 || getBrazilDayOfWeek(day.date) === 6
                  
                  return (
                    <div
                      key={index}
                      className="group relative flex flex-col items-center flex-1"
                      style={{ minWidth: '6px', maxWidth: '18px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 border border-[#3f3f46] text-[#ededed] p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-sm font-medium">{day.fullDate}</div>
                        <div className="text-[#10b981] font-bold text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue)}
                        </div>
                        <div className="text-xs text-[#ededed]">
                          {day.appointmentCount} agendamento{day.appointmentCount !== 1 ? 's' : ''}
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-32 bg-[#27272a]/30 rounded-t flex items-end relative">
                        <div
                          className={`w-full transition-all duration-300 rounded-t ${
                            isWeekend 
                              ? 'bg-emerald-400/70 hover:bg-emerald-400' 
                              : 'bg-[#10b981] hover:bg-emerald-400'
                          } group-hover:shadow-lg cursor-pointer`}
                          style={{ 
                            height: `${height}%`, 
                            minHeight: day.revenue > 0 ? '4px' : '0px' 
                          }}
                          title={`${day.fullDate} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue)} - ${day.appointmentCount} agendamento${day.appointmentCount !== 1 ? 's' : ''}`}
                        />
                      </div>
                      
                      {/* Day Label */}
                      <div className="mt-1 text-center">
                        <div className={`text-xs ${isWeekend ? 'text-orange-400' : 'text-[#71717a]'} font-medium`}>
                          {day.dayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {utcToBrazil(new Date(day.date)).getDate()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Desktop Legend */}
            <div className="hidden sm:flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs text-[#71717a] pt-2 border-t border-[#52525b]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                <span>Dias úteis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400/70 rounded"></div>
                <span>Fins de semana</span>
              </div>
              <span className="text-center">• Passe o mouse sobre as barras para ver detalhes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Analysis Card */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#10b981]" />
              <span className="text-base sm:text-lg">Análise Mensal</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                disabled={monthlyData.findIndex(m => m.month === selectedMonth && m.year === selectedYear) === 0}
                className="text-[#71717a] hover:text-[#ededed]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm sm:text-lg font-semibold text-[#ededed] min-w-[150px] sm:min-w-[200px] text-center">
                {selectedMonthData?.monthName || 'Carregando...'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                disabled={monthlyData.findIndex(m => m.month === selectedMonth && m.year === selectedYear) === monthlyData.length - 1}
                className="text-[#71717a] hover:text-[#ededed]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-[#71717a] text-sm">
            Faturamento detalhado do mês selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-[#10b981] mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthData?.revenue || 0)}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Faturamento Total</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-[#ededed]">{selectedMonthData?.appointmentCount || 0}</p>
              <p className="text-xs sm:text-sm text-[#71717a]">Agendamentos</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-[#ededed] truncate">
                {selectedMonthData?.appointmentCount ? 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedMonthData.revenue / selectedMonthData.appointmentCount)) : 
                  'R$ 0,00'
                }
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Ticket Médio</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-[#ededed]">
                {selectedMonthData?.appointmentCount ? Math.round(selectedMonthData.appointmentCount / 30) : 0}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Média Diária</p>
            </div>
          </div>

          {/* Monthly Chart Preview */}
          <div className="space-y-4">
            <h4 className="text-[#ededed] font-medium text-sm sm:text-base">Últimos 12 Meses</h4>
            
            {/* Mobile Chart - Scrollable horizontal list */}
            <div className="block sm:hidden">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {monthlyData.map((month, index) => {
                    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue))
                    const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                    const isSelected = month.month === selectedMonth && month.year === selectedYear
                    
                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-center min-w-[60px] cursor-pointer transition-all duration-200 ${
                          isSelected ? 'scale-105' : ''
                        }`}
                        onClick={() => {
                          setSelectedMonth(month.month)
                          setSelectedYear(month.year)
                        }}
                      >
                        {/* Bar Container */}
                        <div className="w-10 h-20 bg-[#27272a] rounded-t flex items-end relative mb-2">
                          <div
                            className={`w-full transition-all duration-300 cursor-pointer ${
                              isSelected ? 'bg-[#10b981]' : 'bg-emerald-600/70'
                            }`}
                            style={{ height: `${height}%`, minHeight: month.revenue > 0 ? '8px' : '0px' }}
                          />
                        </div>
                        
                        {/* Month Info */}
                        <div className="text-center">
                          <div className={`text-xs font-medium mb-1 ${
                            isSelected ? 'text-[#10b981]' : 'text-[#71717a]'
                          }`}>
                            {month.shortName}
                          </div>
                          <div className="text-xs text-[#10b981] font-medium">
                            {month.revenue > 0 ? `R$ ${Math.round(month.revenue)}` : 'R$ 0'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {month.appointmentCount} agend.
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="text-center text-xs text-gray-500 pt-3 border-t border-[#52525b]">
                Deslize para ver todos os meses • Toque para selecionar
              </div>
            </div>

            {/* Desktop Chart - Original layout */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-12 gap-2">
                {monthlyData.map((month, index) => {
                  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue))
                  const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                  const isSelected = month.month === selectedMonth && month.year === selectedYear
                  
                  return (
                    <div key={index} className="group relative flex flex-col items-center">
                      <div className="w-full h-24 bg-[#27272a] rounded-t flex items-end justify-center relative">
                        <div
                          className={`w-full transition-all duration-300 cursor-pointer ${
                            isSelected ? 'bg-[#10b981]' : 'bg-emerald-600/70 hover:bg-[#10b981]/90'
                          }`}
                          style={{ height: `${height}%`, minHeight: month.revenue > 0 ? '8px' : '0px' }}
                          onClick={() => {
                            setSelectedMonth(month.month)
                            setSelectedYear(month.year)
                          }}
                          title={`${month.monthName} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.revenue)} - ${month.appointmentCount} agendamentos`}
                        />
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 border border-[#3f3f46] text-[#ededed] p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-sm font-medium">{month.monthName}</div>
                        <div className="text-[#10b981] font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.revenue)}
                        </div>
                        <div className="text-xs text-[#ededed]">
                          {month.appointmentCount} agendamento{month.appointmentCount !== 1 ? 's' : ''}
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>
                      
                      <span className="text-xs text-[#71717a] mt-1 text-center">
                        {month.shortName}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#10b981]" />
              Transações Recentes
            </CardTitle>
            <CardDescription className="text-[#71717a]">Últimos atendimentos realizados hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#10b981]/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-[#10b981]" />
                    </div>
                    <div>
                      <p className="text-[#ededed] font-medium">{transaction.client}</p>
                      <p className="text-sm text-[#71717a]">{transaction.service}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {transaction.method}
                        </Badge>
                        <span className="text-xs text-gray-500">{transaction.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#10b981] font-bold">R$ {transaction.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#10b981]" />
              Serviços Mais Vendidos
            </CardTitle>
            <CardDescription className="text-[#71717a]">Ranking dos serviços por quantidade de agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.map((service, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#ededed] font-medium">{service.service}</p>
                      <p className="text-sm text-[#71717a]">{service.count} atendimentos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#10b981] font-bold">R$ {service.revenue}</p>
                      <p className="text-xs text-[#71717a]">{service.percentage}% do total</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#27272a] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#10b981] to-[#059669] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#10b981]" />
            Formas de Pagamento
          </CardTitle>
          <CardDescription className="text-[#71717a]">Distribuição dos pagamentos por método</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {paymentStats.map((payment, index) => (
              <div key={index} className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-all duration-200">
                <payment.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${payment.color} mx-auto mb-2`} />
                <p className="text-xl sm:text-2xl font-bold text-[#ededed] mb-1">{payment.percentage}%</p>
                <p className="text-xs sm:text-sm text-[#71717a] mb-1 font-medium">{payment.method}</p>
                <p className={`text-xs sm:text-sm ${payment.color} font-semibold`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {payment.count} transação{payment.count !== 1 ? 'ões' : ''}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Modal */}
      <NewExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        isGenerating={isGeneratingReport}
      />
    </div>
  )
}
