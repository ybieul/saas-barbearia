"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Users, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight, User, MapPin } from "lucide-react"
import { useDashboard } from "@/hooks/use-api"
import { useAppointments } from "@/hooks/use-api"
import { Sparkline } from "@/components/ui/sparkline"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { PaymentMethodModal } from "@/components/ui/payment-method-modal"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [appointmentToComplete, setAppointmentToComplete] = useState<any>(null)
  const { dashboardData, loading, error, fetchDashboardData } = useDashboard()
  const { updateAppointment } = useAppointments()
  const { toast } = useToast()
  const router = useRouter()

  // Componente para foto do profissional com fallback
  const ProfessionalAvatar = ({ professional, size = "w-10 h-10" }: { professional: any, size?: string }) => {
    const [imageError, setImageError] = useState(false)
    
    if (professional.avatar && !imageError) {
      return (
        <div className={`${size} rounded-full overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] flex-shrink-0`}>
          <Image
            src={professional.avatar}
            alt={professional.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )
    }
    
    // Fallback para avatar genérico
    return (
      <div className={`${size} bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center flex-shrink-0`}>
        <User className="w-5 h-5 text-white" />
      </div>
    )
  }

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
    router.push('/dashboard/financeiro')
  }

  // Função para abrir modal de pagamento
  const handleCompleteAppointment = (appointment: any) => {
    setAppointmentToComplete(appointment)
    setIsPaymentModalOpen(true)
  }

  // Função para concluir agendamento com forma de pagamento
  const handleCompleteWithPayment = async (paymentMethod: string) => {
    if (!appointmentToComplete) return

    setIsCompletingAppointment(true)
    try {
      // Chamar nova API de conclusão com pagamento
      const response = await fetch(`/api/appointments/${appointmentToComplete.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao concluir agendamento')
      }

      toast({
        title: "✅ Sucesso",
        description: "Agendamento concluído e pagamento registrado!",
      })
      
      // Fechar modal e limpar estado
      setIsPaymentModalOpen(false)
      setAppointmentToComplete(null)
      
      // Recarregar dados do dashboard
      await fetchDashboardData('today')
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error)
      toast({
        title: "❌ Erro",
        description: error instanceof Error ? error.message : "Erro ao concluir agendamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsCompletingAppointment(false)
    }
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

  // Dados dos cards sem comparação temporal

  // Dados dos sparklines
  const sparklines = dashboardData?.sparklines || {
    revenue: [],
    appointments: [],
    clients: [],
    dates: []
  }

  const stats = [
    {
      title: "Faturamento Hoje",
      value: dashboardData?.summary?.revenue ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData.summary.revenue) : 
        "R$ 0,00",
      icon: DollarSign,
      color: "text-[#10b981]",
      sparklineData: sparklines.revenue
    },
    {
      title: "Clientes Ativos",
      value: dashboardData?.summary?.totalClients?.toString() || "0",
      icon: Users,
      color: "text-[#10b981]",
      sparklineData: sparklines.clients
    },
    {
      title: "Agendamentos Hoje",
      value: (dashboardData?.todayAppointments?.length || 0).toString(),
      icon: Calendar,
      color: "text-[#fbbf24]",
      sparklineData: sparklines.appointments
    },
    {
      title: "Taxa de Ocupação",
      value: `${Math.round(dashboardData?.summary?.occupancyRate || 0)}%`,
      icon: TrendingUp,
      color: "text-[#3f3f46]",
      sparklineData: sparklines.appointments // Usar dados de agendamentos como proxy
    },
  ]

  const todayAppointments = dashboardData?.todayAppointments || []
  const nextAppointment = dashboardData?.nextAppointment
  const nextAppointmentsByProfessional = dashboardData?.nextAppointmentsByProfessional || []
  const professionals = dashboardData?.professionals || []

  // Debug detalhado
  console.log('🔍 Dashboard data recebido:', dashboardData)
  console.log('🔍 Today appointments:', todayAppointments)
  console.log('🔍 Next appointment:', nextAppointment)
  console.log('🔍 Next appointments by professional:', nextAppointmentsByProfessional)
  console.log('🔍 Professionals with avatars:', professionals)
  console.log('🔍 Summary:', dashboardData?.summary)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Olá, {user?.name || "Usuário"}! 👋</h1>
        <p className="text-[#a1a1aa] capitalize">{today}</p>
      </div>

      {/* Stats Cards com Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a] hover:border-[#10b981]/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#a1a1aa]">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-3">
                <div className="text-3xl font-bold text-[#ededed]">{stat.value}</div>
                <div className="flex justify-center">
                  <Sparkline 
                    data={stat.sparklineData} 
                    color={stat.color.includes('#10b981') ? '#10b981' : stat.color.includes('#fbbf24') ? '#fbbf24' : '#3f3f46'} 
                    width={80} 
                    height={24} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Próximos Agendamentos por Profissional */}
      {nextAppointmentsByProfessional.length > 0 && (
        <Card className="bg-gradient-to-r from-[#10b981]/10 to-[#10b981]/5 border-[#10b981]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                <CardTitle className="text-[#ededed] text-lg">Próximos na Fila</CardTitle>
              </div>
              <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                {nextAppointmentsByProfessional.length} profissionais
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nextAppointmentsByProfessional.map((item: any) => (
                <div key={item.professional.id} className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#27272a] hover:border-[#10b981]/50 transition-colors">
                  <div className="space-y-3">
                    {/* Header do Profissional */}
                    <div className="flex items-center gap-3">
                      <ProfessionalAvatar professional={item.professional} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#ededed] text-sm">{item.professional.name}</h4>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#10b981]" />
                          <span className="text-xs text-[#a1a1aa]">Próximo</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Informações do Agendamento */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-[#10b981]">{item.nextAppointment.time}</span>
                        <Badge
                          className={
                            item.nextAppointment.status === "IN_PROGRESS"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }
                        >
                          {item.nextAppointment.status === "IN_PROGRESS" ? "Em andamento" : "Confirmado"}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="font-medium text-[#ededed] text-sm">{item.nextAppointment.client}</p>
                        <p className="text-xs text-[#a1a1aa]">
                          {item.nextAppointment.service}
                          <span className="ml-1">({item.nextAppointment.duration} min)</span>
                        </p>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-[#10b981]/30 hover:bg-[#10b981]/10 hover:border-[#10b981]/50 text-xs"
                          onClick={() => router.push('/dashboard/clientes')}
                        >
                          <User className="w-3 h-3 mr-1" />
                          Ver Cliente
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[#10b981] hover:bg-[#059669] text-xs"
                          onClick={() => handleCompleteAppointment(item.nextAppointment)}
                          disabled={isCompletingAppointment}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {isCompletingAppointment ? "..." : "Concluir"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mostrar profissionais livres se existirem */}
            {professionals.filter((prof: any) => !nextAppointmentsByProfessional.find((item: any) => item.professional.id === prof.id)).length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#27272a]">
                <p className="text-sm text-[#a1a1aa] mb-2">Profissionais livres:</p>
                <div className="flex flex-wrap gap-2">
                  {professionals
                    .filter((prof: any) => !nextAppointmentsByProfessional.find((item: any) => item.professional.id === prof.id))
                    .map((prof: any) => (
                      <Badge key={prof.id} variant="outline" className="border-[#27272a] text-[#a1a1aa]">
                        {prof.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback: Próximo Agendamento Geral (caso não haja por profissional) */}
      {nextAppointmentsByProfessional.length === 0 && nextAppointment && (
        <Card className="bg-gradient-to-r from-[#10b981]/10 to-[#10b981]/5 border-[#10b981]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                <CardTitle className="text-[#ededed] text-lg">O que vem a seguir?</CardTitle>
              </div>
              <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                Próximo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold text-[#10b981]">{nextAppointment.time}</span>
                  <span className="text-sm text-[#a1a1aa]">{nextAppointment.date}</span>
                </div>
                <p className="text-lg font-semibold text-[#ededed]">{nextAppointment.client}</p>
                <p className="text-sm text-[#a1a1aa]">
                  {nextAppointment.service} 
                  {nextAppointment.professional && ` com ${nextAppointment.professional}`}
                  <span className="ml-2 text-xs">({nextAppointment.duration} min)</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-[#10b981]/30 hover:bg-[#10b981]/10 hover:border-[#10b981]/50"
                  onClick={() => router.push('/dashboard/clientes')}
                >
                  <User className="w-4 h-4 mr-1" />
                  Ver Histórico
                </Button>
                <Button 
                  size="sm" 
                  className="bg-[#10b981] hover:bg-[#059669]"
                  onClick={() => handleCompleteAppointment(nextAppointment)}
                  disabled={isCompletingAppointment}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {isCompletingAppointment ? "Concluindo..." : "Concluir"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda de Hoje - 2 colunas */}
        <div className="lg:col-span-2">
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#10b981]" />
                  Agenda de Hoje
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                    {todayAppointments.length} agendamentos
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard/agenda')}
                    className="border-[#27272a] hover:bg-[#27272a]"
                  >
                    Ver Todos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAppointments.length > 0 ? (
                  todayAppointments.slice(0, 6).map((appointment: any, index: number) => (
                    <div key={index} className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#27272a] hover:border-[#10b981]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-lg font-semibold text-[#ededed]">{appointment.time}</span>
                            <Badge
                              className={
                                appointment.status === "COMPLETED"
                                  ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                                  : appointment.status === "IN_PROGRESS"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              }
                            >
                              {appointment.status === "COMPLETED"
                                ? "Concluído"
                                : appointment.status === "IN_PROGRESS"
                                ? "Em andamento"
                                : "Confirmado"}
                            </Badge>
                          </div>
                          <p className="text-[#ededed] font-medium">{appointment.client}</p>
                          <p className="text-sm text-[#a1a1aa]">
                            {appointment.service}
                            {appointment.professional && ` • ${appointment.professional}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#a1a1aa]">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-[#71717a]" />
                    <h3 className="text-lg font-medium text-[#ededed] mb-1">Nenhum agendamento para hoje</h3>
                    <p className="text-sm">Que tal aproveitar para planejar o amanhã?</p>
                    <Button 
                      className="mt-3 bg-[#10b981] hover:bg-[#059669]"
                      onClick={() => router.push('/dashboard/agenda')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Criar Agendamento
                    </Button>
                  </div>
                )}
                {todayAppointments.length > 6 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push('/dashboard/agenda')}
                      className="text-[#10b981] hover:bg-[#10b981]/10"
                    >
                      Ver mais {todayAppointments.length - 6} agendamentos
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral */}
        <div className="space-y-6">
          {/* Taxa de Ocupação por Profissional */}
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#a1a1aa] text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#10b981]" />
                Ocupação por Profissional
              </CardTitle>
              <CardDescription className="text-[#a1a1aa] text-xs">Distribuição de agendamentos hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionals.length > 0 ? (
                  professionals.map((prof: any) => (
                    <div key={prof.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#ededed] font-medium">{prof.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#a1a1aa]">{prof.appointmentsToday || 0} agend.</span>
                          <span className="text-[#10b981] font-semibold">{prof.occupancyRate || 0}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={prof.occupancyRate || 0} 
                        className="h-2 bg-[#27272a]"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-[#a1a1aa]">
                    <Users className="w-8 h-8 mx-auto mb-2 text-[#71717a]" />
                    <p className="text-sm">Nenhum profissional cadastrado</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-[#27272a] hover:bg-[#27272a]"
                      onClick={() => router.push('/dashboard/configuracoes')}
                    >
                      Cadastrar Profissional
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#a1a1aa] text-base font-semibold">Ações Rápidas</CardTitle>
              <CardDescription className="text-[#a1a1aa] text-xs">Acesso rápido às principais funcionalidades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleNewClient}
                  className="group relative p-4 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Novo Cliente</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleSchedule}
                  className="group relative p-4 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Agendar</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleFinancial}
                  className="group relative p-4 bg-gradient-to-br from-[#fbbf24]/10 to-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl hover:from-[#fbbf24]/20 hover:to-[#fbbf24]/10 hover:border-[#fbbf24]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#fbbf24] transition-colors">Financeiro</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleReports}
                  className="group relative p-4 bg-gradient-to-br from-[#3f3f46]/10 to-[#3f3f46]/5 border border-[#27272a] rounded-xl hover:from-[#3f3f46]/20 hover:to-[#3f3f46]/10 hover:border-[#3f3f46]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#3f3f46] to-[#27272a] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#3f3f46] transition-colors">Relatórios</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Forma de Pagamento */}
      <PaymentMethodModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setAppointmentToComplete(null)
        }}
        onSelectPayment={handleCompleteWithPayment}
        appointmentData={appointmentToComplete ? {
          client: appointmentToComplete.client,
          service: appointmentToComplete.service,
          totalPrice: appointmentToComplete.totalPrice || 0,
          time: appointmentToComplete.time
        } : undefined}
        isLoading={isCompletingAppointment}
      />
    </div>
  )
}
