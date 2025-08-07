"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, Calendar, DollarSign, Users, Clock, Star } from "lucide-react"
import { useDashboard, useAppointments } from "@/hooks/use-api"
import { utcToBrazil, getBrazilDayOfWeek, debugTimezone } from "@/lib/timezone"

export default function RelatoriosPage() {
  const { dashboardData, loading, error, fetchDashboardData } = useDashboard()
  const { appointments, fetchAppointments } = useAppointments()

  useEffect(() => {
    fetchDashboardData()
    fetchAppointments()
  }, [fetchDashboardData, fetchAppointments])

  // 🇧🇷 CORREÇÃO: Calcular dados comparativos usando timezone brasileiro
  const nowBrazil = utcToBrazil(new Date())
  const currentMonth = nowBrazil.getMonth()
  const currentYear = nowBrazil.getFullYear()
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

  // 🇧🇷 CORREÇÃO: Filtrar agendamentos do mês atual e anterior usando timezone brasileiro
  const thisMonthAppointments = appointments.filter(apt => {
    const aptDateBrazil = utcToBrazil(new Date(apt.dateTime))
    return aptDateBrazil.getMonth() === currentMonth && aptDateBrazil.getFullYear() === currentYear
  })

  const lastMonthAppointments = appointments.filter(apt => {
    const aptDateBrazil = utcToBrazil(new Date(apt.dateTime))
    return aptDateBrazil.getMonth() === lastMonth && aptDateBrazil.getFullYear() === lastMonthYear
  })

  // Calcular métricas reais
  const completedThisMonth = thisMonthAppointments.filter(apt => apt.status === 'completed')
  const completedLastMonth = lastMonthAppointments.filter(apt => apt.status === 'completed')

  const thisMonthRevenue = completedThisMonth.reduce((sum, apt) => sum + (apt.totalPrice || 0), 0)
  const lastMonthRevenue = completedLastMonth.reduce((sum, apt) => sum + (apt.totalPrice || 0), 0)

  const thisMonthAppointmentsCount = thisMonthAppointments.length
  const lastMonthAppointmentsCount = lastMonthAppointments.length

  // Calcular ticket médio
  const thisMonthTicket = completedThisMonth.length > 0 ? thisMonthRevenue / completedThisMonth.length : 0
  const lastMonthTicket = completedLastMonth.length > 0 ? lastMonthRevenue / completedLastMonth.length : 0

  // Função para calcular mudança percentual
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return "Novo"
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${Math.round(change)}% vs mês anterior`
  }

  // Calcular análise de horários real baseada nos agendamentos
  const calculateTimeAnalysis = () => {
    const timeSlots = [
      { period: "Manhã", time: "08:00 - 12:00", startHour: 8, endHour: 12, isWeekend: false },
      { period: "Tarde", time: "12:00 - 18:00", startHour: 12, endHour: 18, isWeekend: false },
      { period: "Noite", time: "18:00 - 20:00", startHour: 18, endHour: 20, isWeekend: false },
      { period: "Sábado", time: "08:00 - 17:00", startHour: 8, endHour: 17, isWeekend: true },
    ]

    return timeSlots.map(slot => {
      let filteredAppointments = appointments

      // 🇧🇷 CORREÇÃO: Filtrar por fim de semana usando timezone brasileiro
      if (slot.isWeekend) {
        filteredAppointments = appointments.filter(apt => {
          const aptDateBrazil = utcToBrazil(new Date(apt.dateTime || apt.date))
          const dayOfWeek = getBrazilDayOfWeek(new Date(apt.dateTime || apt.date))
          return dayOfWeek === 6 // Sábado no timezone brasileiro
        })
      } else {
        // Filtrar apenas dias úteis (segunda a sexta) usando timezone brasileiro
        filteredAppointments = appointments.filter(apt => {
          const dayOfWeek = getBrazilDayOfWeek(new Date(apt.dateTime || apt.date))
          return dayOfWeek >= 1 && dayOfWeek <= 5 // Segunda a sexta no timezone brasileiro
        })
      }

      // Filtrar por horário
      const slotAppointments = filteredAppointments.filter(apt => {
        const timeStr = apt.time || "09:00"
        const hour = parseInt(timeStr.split(':')[0])
        return hour >= slot.startHour && hour < slot.endHour
      })

      // Calcular total de slots disponíveis no período
      const totalHours = slot.endHour - slot.startHour
      const slotsPerHour = 2 // 30 min cada slot
      const totalSlots = totalHours * slotsPerHour
      
      // Ajustar para número de dias úteis ou sábados no mês
      const daysInPeriod = slot.isWeekend ? 4 : 22 // ~4 sábados ou ~22 dias úteis por mês
      const totalSlotsInMonth = totalSlots * daysInPeriod

      // Calcular ocupação
      const occupancy = totalSlotsInMonth > 0 ? Math.min(100, Math.round((slotAppointments.length / totalSlotsInMonth) * 100)) : 0

      return {
        period: slot.period,
        time: slot.time,
        occupancy,
        appointments: slotAppointments.length
      }
    })
  }

  const timeAnalysisData = calculateTimeAnalysis()

  // Dados fictícios serão substituídos por dados reais da API
  const monthlyData: any[] = []
  const topServices: any[] = []
  const professionalPerformance: any[] = []

  const reportStats = [
    {
      title: "Faturamento Mensal",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(thisMonthRevenue),
      change: calculateChange(thisMonthRevenue, lastMonthRevenue),
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      title: "Agendamentos",
      value: thisMonthAppointmentsCount.toString(),
      change: calculateChange(thisMonthAppointmentsCount, lastMonthAppointmentsCount),
      icon: Calendar,
      color: "text-blue-400",
    },
    {
      title: "Novos Clientes",
      value: dashboardData?.stats?.newClients?.toString() || "0",
      change: calculateChange(dashboardData?.stats?.newClients || 0, dashboardData?.previousStats?.newClients || 0),
      icon: Users,
      color: "text-purple-400",
    },
    {
      title: "Ticket Médio",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(thisMonthTicket),
      change: calculateChange(thisMonthTicket, lastMonthTicket),
      icon: TrendingUp,
      color: "text-yellow-400",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed] flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-[#10b981]" />
            Relatórios
          </h1>
          <p className="text-[#3f3f46]">Análise completa do seu negócio</p>
        </div>
        {/* Botão de exportar removido - implementação futura */}
      </div>

      {/* Report Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportStats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#a1a1aa]">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-emerald-400">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Performance Chart */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Performance Mensal
          </CardTitle>
          <CardDescription className="text-gray-400">
            Evolução do faturamento e agendamentos nos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-emerald-400">{data.month}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">R$ {data.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">
                      {data.appointments} agendamentos • {data.clients} clientes
                    </p>
                  </div>
                </div>
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(data.revenue / 30000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Serviços Mais Populares
            </CardTitle>
            <CardDescription className="text-gray-400">Ranking por quantidade e faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{service.service}</p>
                      <p className="text-sm text-gray-400">{service.count} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">R$ {service.revenue}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      {service.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Professional Performance */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Performance dos Profissionais
            </CardTitle>
            <CardDescription className="text-gray-400">Desempenho individual por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {professionalPerformance.map((professional, index) => (
                <div key={index} className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{professional.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{professional.name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-400">{professional.rating}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{professional.growth}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Agendamentos</p>
                      <p className="text-white font-medium">{professional.appointments}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Faturamento</p>
                      <p className="text-emerald-400 font-medium">R$ {professional.revenue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Analysis */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Análise de Horários
          </CardTitle>
          <CardDescription className="text-gray-400">Horários com maior movimento e ocupação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {timeAnalysisData.map((period, index) => (
              <div key={index} className="text-center p-4 bg-gray-900/50 rounded-lg">
                <h4 className="text-white font-medium mb-1">{period.period}</h4>
                <p className="text-xs text-gray-400 mb-3">{period.time}</p>
                <div className="w-16 h-16 mx-auto mb-2 relative">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgb(55 65 81)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgb(16 185 129)"
                      strokeWidth="2"
                      strokeDasharray={`${period.occupancy}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-400">{period.occupancy}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{period.appointments} agendamentos</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
