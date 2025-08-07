"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, Calendar, DollarSign, Users, Clock, Star } from "lucide-react"
import { useReports, useAppointments } from "@/hooks/use-api"
import { utcToBrazil, getBrazilNow } from "@/lib/timezone"

export default function RelatoriosPage() {
  const { 
    reportsData, 
    loading, 
    error, 
    fetchOverview,
    fetchMonthlyPerformance,
    fetchServicesReport,
    fetchProfessionalsReport,
    fetchTimeAnalysis
  } = useReports()

  // Estados para dados específicos
  const [overviewData, setOverviewData] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [topServices, setTopServices] = useState<any[]>([])
  const [professionalPerformance, setProfessionalPerformance] = useState<any[]>([])
  const [timeAnalysisData, setTimeAnalysisData] = useState<any[]>([])

  useEffect(() => {
    loadAllReports()
  }, [])

  const loadAllReports = async () => {
    try {
      // Buscar dados de overview
      const overview = await fetchOverview()
      if (overview?.data?.overview) {
        setOverviewData(overview.data.overview)
      }

      // Buscar performance mensal
      const monthly = await fetchMonthlyPerformance()
      if (monthly?.data?.monthlyPerformance) {
        setMonthlyData(monthly.data.monthlyPerformance)
      }

      // Buscar serviços populares
      const services = await fetchServicesReport()
      if (services?.data?.topServices) {
        setTopServices(services.data.topServices)
      }

      // Buscar performance dos profissionais
      const professionals = await fetchProfessionalsReport()
      if (professionals?.data?.professionalPerformance) {
        setProfessionalPerformance(professionals.data.professionalPerformance)
      }

      // Buscar análise de horários
      const timeAnalysis = await fetchTimeAnalysis()
      if (timeAnalysis?.data?.timeAnalysis) {
        setTimeAnalysisData(timeAnalysis.data.timeAnalysis)
      }

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    }
  }

  const reportStats = [
    {
      title: "Faturamento Mensal",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overviewData?.revenue?.current || 0),
      change: overviewData?.revenue?.change || "0%",
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      title: "Agendamentos",
      value: (overviewData?.appointments?.current || 0).toString(),
      change: overviewData?.appointments?.change || "0%",
      icon: Calendar,
      color: "text-blue-400",
    },
    {
      title: "Novos Clientes",
      value: (overviewData?.newClients?.current || 0).toString(),
      change: overviewData?.newClients?.change || "0%",
      icon: Users,
      color: "text-purple-400",
    },
    {
      title: "Ticket Médio",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overviewData?.averageTicket?.current || 0),
      change: overviewData?.averageTicket?.change || "0%",
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
            {monthlyData.length > 0 ? monthlyData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-emerald-400">{data.month}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">R$ {Number(data.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm text-gray-400">
                      {data.appointments} agendamentos • {data.clients} clientes
                    </p>
                  </div>
                </div>
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (data.revenue / 30000) * 100)}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhum dado encontrado para exibir</p>
              </div>
            )}
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
              {topServices.length > 0 ? topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{service.name}</p>
                      <p className="text-sm text-gray-400">{service.count} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold">R$ {Number(service.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      {service.growth}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Nenhum serviço encontrado</p>
                </div>
              )}
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
              {professionalPerformance.length > 0 ? professionalPerformance.map((professional, index) => (
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
              )) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Nenhum profissional encontrado</p>
                </div>
              )}
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
