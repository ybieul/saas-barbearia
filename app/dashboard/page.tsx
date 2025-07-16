"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useDashboard } from "@/hooks/use-api"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const { dashboardData, loading, error, fetchDashboardData } = useDashboard()
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
    fetchDashboardData('today')
  }, [fetchDashboardData])

  // Funções para navegação das ações rápidas
  const handleNewClient = () => {
    router.push('/dashboard/clientes')
  }

  const handleSchedule = () => {
    router.push('/dashboard/agenda')
  }

  const handleFinancial = () => {
    router.push('/dashboard/financeiro')
  }

  const handleReports = () => {
    router.push('/dashboard/relatorios')
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-2 text-[#71717a]">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          Erro ao carregar dados: {error}
        </div>
      </div>
    )
  }

  // Calcular mudanças reais comparando com dados anteriores
  const yesterdayRevenue = dashboardData?.previousStats?.totalRevenue || 0
  const yesterdayClients = dashboardData?.previousStats?.totalClients || 0
  const yesterdayAppointments = dashboardData?.previousStats?.totalAppointments || 0
  const yesterdayOccupancy = dashboardData?.previousStats?.occupancyRate || 0
  
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return "Novo"
    const change = ((current - previous) / previous) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${Math.round(change)}%`
  }

  const stats = [
    {
      title: "Faturamento Hoje",
      value: dashboardData?.stats?.totalRevenue ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData.stats.totalRevenue) : 
        "R$ 0,00",
      change: calculateChange(dashboardData?.stats?.totalRevenue || 0, yesterdayRevenue),
      icon: DollarSign,
      color: "text-[#10b981]",
    },
    {
      title: "Clientes Ativos",
      value: dashboardData?.stats?.totalClients?.toString() || "0",
      change: calculateChange(dashboardData?.stats?.totalClients || 0, yesterdayClients),
      icon: Users,
      color: "text-[#10b981]",
    },
    {
      title: "Agendamentos Hoje",
      value: (dashboardData?.todayAppointments?.length || 0).toString(),
      change: calculateChange(dashboardData?.todayAppointments?.length || 0, yesterdayAppointments),
      icon: Calendar,
      color: "text-[#fbbf24]",
    },
    {
      title: "Taxa de Ocupação",
      value: `${Math.round(dashboardData?.stats?.occupancyRate || 0)}%`,
      change: calculateChange(dashboardData?.stats?.occupancyRate || 0, yesterdayOccupancy),
      icon: TrendingUp,
      color: "text-[#3f3f46]",
    },
  ]

  const todayAppointments = dashboardData?.todayAppointments || []

  console.log('Dashboard data recebido:', dashboardData)
  console.log('Today appointments:', todayAppointments)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Olá, {user?.name || "Usuário"}! 👋</h1>
        <p className="text-[#a1a1aa] capitalize">{today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#a1a1aa]">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#ededed]">{stat.value}</div>
              <p className="text-xs text-[#10b981]">{stat.change} em relação a ontem</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#10b981]" />
                Agenda de Hoje
              </CardTitle>
              <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                {todayAppointments.length} agendamentos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment: any, index: number) => (
                  <div key={index} className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#27272a]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg font-semibold text-[#ededed]">{appointment.time}</span>
                          <Badge
                            className={
                              appointment.status === "completed"
                                ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                                : appointment.status === "confirmed"
                                ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                                : "bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/30"
                            }
                          >
                            {appointment.status === "completed"
                              ? "Agendado"
                              : appointment.status === "confirmed"
                              ? "Agendado"
                              : "Agendado"}
                          </Badge>
                        </div>
                        <p className="text-[#ededed] font-medium">{appointment.client}</p>
                        <p className="text-sm text-[#a1a1aa]">{appointment.service}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[#a1a1aa]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-[#71717a]" />
                  <p>Nenhum agendamento para hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader className="pb-4">
            <CardTitle className="text-[#a1a1aa] text-lg font-semibold">Ações Rápidas</CardTitle>
            <CardDescription className="text-[#a1a1aa] text-sm">Acesso rápido às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleNewClient}
                className="group relative p-6 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#10b981]/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Novo Cliente</p>
                </div>
              </button>
              
              <button 
                onClick={handleSchedule}
                className="group relative p-6 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#10b981]/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Agendar</p>
                </div>
              </button>
              
              <button 
                onClick={handleFinancial}
                className="group relative p-6 bg-gradient-to-br from-[#fbbf24]/10 to-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl hover:from-[#fbbf24]/20 hover:to-[#fbbf24]/10 hover:border-[#fbbf24]/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#fbbf24]/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#fbbf24]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-[#ededed] group-hover:text-[#fbbf24] transition-colors">Financeiro</p>
                </div>
              </button>
              
              <button 
                onClick={handleReports}
                className="group relative p-6 bg-gradient-to-br from-[#3f3f46]/10 to-[#3f3f46]/5 border border-[#27272a] rounded-xl hover:from-[#3f3f46]/20 hover:to-[#3f3f46]/10 hover:border-[#3f3f46]/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#3f3f46]/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3f3f46]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#3f3f46] to-[#27272a] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-[#ededed] group-hover:text-[#3f3f46] transition-colors">Relatórios</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
