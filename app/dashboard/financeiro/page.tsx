"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, Banknote, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { useDashboard, useAppointments } from "@/hooks/use-api"

export default function FinanceiroPage() {
  const [period, setPeriod] = useState('today')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const { dashboardData, loading, fetchDashboardData } = useDashboard()
  const { appointments, fetchAppointments } = useAppointments()

  useEffect(() => {
    fetchDashboardData(period)
    fetchAppointments() // Buscar todos os agendamentos para transações
  }, [period, fetchDashboardData, fetchAppointments])

  // Filtrar apenas agendamentos concluídos com dados válidos
  const completedAppointments = appointments.filter(app => 
    app.status === 'COMPLETED' && 
    app.totalPrice > 0 && 
    app.dateTime &&
    new Date(app.dateTime) <= new Date() // Apenas agendamentos já realizados
  )
  
  // Função para filtrar agendamentos por mês/ano
  const getAppointmentsByMonth = (month: number, year: number) => {
    return completedAppointments.filter(app => {
      const appointmentDate = new Date(app.date)
      return appointmentDate.getMonth() === month && appointmentDate.getFullYear() === year
    })
  }

  // Função para obter dados dos últimos 12 meses com dados reais
  const getMonthlyData = () => {
    const monthlyData = []
    const currentDate = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      
      // Filtrar agendamentos do mês específico
      const monthAppointments = completedAppointments.filter(app => {
        const appointmentDate = new Date(app.date)
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
    const currentDate = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setDate(currentDate.getDate() - i)
      
      // Filtrar agendamentos do dia específico
      const dayAppointments = completedAppointments.filter(app => {
        const appointmentDate = new Date(app.date)
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

  // Dados diários com cálculos otimizados
  const dailyData = getDailyData()
  const totalDailyRevenue = dailyData.reduce((total, day) => total + day.revenue, 0)
  const averageDailyRevenue = dailyData.length > 0 ? totalDailyRevenue / dailyData.length : 0
  const maxDailyRevenue = dailyData.length > 0 ? Math.max(...dailyData.map(d => d.revenue)) : 0
  const bestDay = dailyData.find(d => d.revenue === maxDailyRevenue)

  // Dados mensais com cálculos otimizados
  const monthlyData = getMonthlyData()
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
  
  // Simular métodos de pagamento baseados nos dados existentes (temporário)
  // Distribui os agendamentos em métodos de pagamento de forma simulada mas consistente
  const totalAppointments = completedAppointments.length
  const cashCount = Math.floor(totalAppointments * 0.45) // 45% dinheiro
  const cardCount = Math.floor(totalAppointments * 0.35) // 35% cartão
  const pixCount = totalAppointments - cashCount - cardCount // Resto PIX
  
  const cashAppointments = completedAppointments.slice(0, cashCount)
  const cardAppointments = completedAppointments.slice(cashCount, cashCount + cardCount)
  const pixAppointments = completedAppointments.slice(cashCount + cardCount)
  
  // Calcular receita total com dados reais
  const totalRevenue = completedAppointments.reduce((total, app) => {
    const price = parseFloat(app.totalPrice) || 0
    return total + price
  }, 0)
  
  const paymentStats = [
    {
      method: 'Dinheiro',
      icon: Banknote,
      color: 'text-green-400',
      bgColor: 'bg-green-400',
      count: cashAppointments.length,
      amount: cashAppointments.reduce((total, app) => {
        const price = parseFloat(app.totalPrice) || 0
        return total + price
      }, 0),
      percentage: totalRevenue > 0 && cashAppointments.length > 0 ? 
        Math.round((cashAppointments.reduce((total, app) => {
          const price = parseFloat(app.totalPrice) || 0
          return total + price
        }, 0) / totalRevenue) * 100) : 0
    },
    {
      method: 'Cartão', 
      icon: CreditCard,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400',
      count: cardAppointments.length,
      amount: cardAppointments.reduce((total, app) => {
        const price = parseFloat(app.totalPrice) || 0
        return total + price
      }, 0),
      percentage: totalRevenue > 0 && cardAppointments.length > 0 ? 
        Math.round((cardAppointments.reduce((total, app) => {
          const price = parseFloat(app.totalPrice) || 0
          return total + price
        }, 0) / totalRevenue) * 100) : 0
    },
    {
      method: 'PIX',
      icon: DollarSign, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-400',
      count: pixAppointments.length,
      amount: pixAppointments.reduce((total, app) => {
        const price = parseFloat(app.totalPrice) || 0
        return total + price
      }, 0),
      percentage: totalRevenue > 0 && pixAppointments.length > 0 ? 
        Math.round((pixAppointments.reduce((total, app) => {
          const price = parseFloat(app.totalPrice) || 0
          return total + price
        }, 0) / totalRevenue) * 100) : 0
    }
  ]
  
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

  // Função para exportar relatório financeiro
  const handleExportReport = () => {
    const today = new Date().toLocaleDateString('pt-BR')
    const reportData = [
      ['RELATÓRIO FINANCEIRO'],
      [`Data de Geração: ${today}`],
      [''],
      ['RESUMO GERAL'],
      ['Métrica', 'Valor', 'Variação'],
      ['Faturamento Hoje', dashboardData?.stats?.totalRevenue ? `R$ ${(Number(dashboardData.stats.totalRevenue) || 0).toFixed(2).replace('.', ',')}` : 'R$ 0,00', revenueChange.change],
      ['Agendamentos Concluídos', completedAppointments.length.toString(), completedChange.change],
      ['Taxa de Conversão', `${Math.round((completedAppointments.length / Math.max(appointments.length, 1)) * 100)}%`, conversionChange.change],
      ['Ticket Médio', `R$ ${(Number(currentTicketMedio) || 0).toFixed(2).replace('.', ',')}`, ticketChange.change],
      [''],
      ['FORMAS DE PAGAMENTO'],
      ['Método', 'Quantidade', 'Valor', 'Percentual'],
      ...paymentStats.map(payment => [
        payment.method,
        payment.count.toString(),
        `R$ ${(Number(payment.amount) || 0).toFixed(2).replace('.', ',')}`,
        `${payment.percentage}%`
      ]),
      [''],
      ['AGENDAMENTOS CONCLUÍDOS'],
      ['Cliente', 'Serviço', 'Valor', 'Data'],
      ...completedAppointments.slice(0, 50).map(apt => [
        apt.clientName || 'Cliente',
        apt.serviceName || 'Serviço',
        `R$ ${(Number(apt.totalPrice) || 0).toFixed(2).replace('.', ',')}`,
        apt.date
      ])
    ]

    // Converter para CSV
    const csvContent = reportData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const recentTransactions: any[] = []

  const topServices: any[] = []

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#a1a1aa]">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-[#10b981]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#ededed]">{stat.value}</div>
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
          <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#10b981]" />
            Receita Diária - Últimos 30 Dias
          </CardTitle>
          <CardDescription className="text-[#71717a]">
            Acompanhe o faturamento diário e identifique tendências
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <DollarSign className="w-6 h-6 text-[#10b981] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#ededed]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDailyRevenue)}
              </p>
              <p className="text-sm text-[#71717a]">Total 30 Dias</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#ededed]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageDailyRevenue)}
              </p>
              <p className="text-sm text-[#71717a]">Média Diária</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#ededed]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxDailyRevenue)}
              </p>
              <p className="text-sm text-[#71717a]">Melhor Dia</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-[#ededed]">
                {bestDay?.fullDate || 'N/A'}
              </p>
              <p className="text-sm text-[#71717a]">Data do Melhor Dia</p>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[#ededed] font-medium">Gráfico de Receita Diária</h4>
              <div className="flex items-center gap-2 text-sm text-[#71717a]">
                <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                <span>Receita do dia</span>
              </div>
            </div>
            
            <div className="relative pt-16 pb-4">
              {/* Chart Container */}
              <div className="flex items-end justify-between gap-1 h-32 px-4 relative">
                {dailyData.map((day, index) => {
                  const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
                  const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6
                  
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
                          {new Date(day.date).getDate()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs text-[#71717a] pt-2 border-t border-[#52525b]">
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
          <CardTitle className="text-[#a1a1aa] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#10b981]" />
              Análise Mensal
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                disabled={monthlyData.findIndex(m => m.month === selectedMonth && m.year === selectedYear) === 0}
                className="text-[#71717a] hover:text-[#ededed]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-semibold text-[#ededed] min-w-[200px] text-center">
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
          <CardDescription className="text-[#71717a]">
            Faturamento detalhado do mês selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <DollarSign className="w-8 h-8 text-[#10b981] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#ededed]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthData?.revenue || 0)}
              </p>
              <p className="text-[#71717a]">Faturamento Total</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#ededed]">{selectedMonthData?.appointmentCount || 0}</p>
              <p className="text-[#71717a]">Agendamentos</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#ededed]">
                {selectedMonthData?.appointmentCount ? 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedMonthData.revenue / selectedMonthData.appointmentCount)) : 
                  'R$ 0,00'
                }
              </p>
              <p className="text-[#71717a]">Ticket Médio</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <CreditCard className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#ededed]">
                {selectedMonthData?.appointmentCount ? Math.round(selectedMonthData.appointmentCount / 30) : 0}
              </p>
              <p className="text-[#71717a]">Média Diária</p>
            </div>
          </div>

          {/* Monthly Chart Preview */}
          <div className="space-y-4">
            <h4 className="text-[#ededed] font-medium">Últimos 12 Meses</h4>
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
            <CardDescription className="text-[#71717a]">Ranking dos serviços por faturamento</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentStats.map((payment, index) => (
              <div key={index} className="text-center p-4 bg-gray-900/50 rounded-lg">
                <payment.icon className={`w-8 h-8 ${payment.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-[#ededed]">{payment.percentage}%</p>
                <p className="text-[#71717a]">{payment.method}</p>
                <p className={`text-sm ${payment.color}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{payment.count} transações</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
