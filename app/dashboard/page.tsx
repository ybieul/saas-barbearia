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
  const ProfessionalAvatar = ({ professional, size = "w-8 h-8 md:w-10 md:h-10" }: { professional: any, size?: string }) => {
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
        <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#ededed] mb-1 md:mb-2">Olá, {user?.name || "Usuário"}! 👋</h1>
        <p className="text-sm md:text-base text-[#a1a1aa] capitalize">{today}</p>
      </div>

      {/* Stats Cards com Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-[#18181b] border-[#27272a] hover:border-[#10b981]/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium text-[#a1a1aa] leading-tight">{stat.title}</CardTitle>
              <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-center space-y-2 md:space-y-3">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold text-[#ededed] break-words">{stat.value}</div>
                <div className="flex justify-center">
                  <Sparkline 
                    data={stat.sparklineData} 
                    color={stat.color.includes('#10b981') ? '#10b981' : stat.color.includes('#fbbf24') ? '#fbbf24' : '#3f3f46'} 
                    width={60} 
                    height={18} 
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
          <CardHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-3 md:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                <CardTitle className="text-[#ededed] text-base md:text-lg lg:text-xl">Próximos na Fila</CardTitle>
              </div>
              <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 text-xs md:text-sm self-start sm:self-center">
                {nextAppointmentsByProfessional.length} profissionais
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {nextAppointmentsByProfessional.map((item: any) => (
                <div key={item.professional.id} className="bg-[#0a0a0a]/50 rounded-lg p-3 md:p-4 border border-[#27272a] hover:border-[#10b981]/50 transition-colors">
                  <div className="space-y-2 md:space-y-3">
                    {/* Header do Profissional */}
                    <div className="flex items-center gap-2 md:gap-3">
                      <ProfessionalAvatar professional={item.professional} size="w-8 h-8 md:w-10 md:h-10" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#ededed] text-xs md:text-sm truncate">{item.professional.name}</h4>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#10b981] flex-shrink-0" />
                          <span className="text-xs text-[#a1a1aa]">Próximo</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Informações do Agendamento */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base md:text-lg font-bold text-[#10b981] flex-shrink-0">{item.nextAppointment.time}</span>
                        <Badge
                          className={`text-xs flex-shrink-0 ${
                            item.nextAppointment.status === "IN_PROGRESS"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {item.nextAppointment.status === "IN_PROGRESS" ? "Em andamento" : "Confirmado"}
                        </Badge>
                      </div>
                      
                      <div className="min-w-0">
                        <p className="font-medium text-[#ededed] text-xs md:text-sm truncate">{item.nextAppointment.client}</p>
                        <p className="text-xs text-[#a1a1aa] line-clamp-2">
                          {item.nextAppointment.service}
                          <span className="ml-1">({item.nextAppointment.duration} min)</span>
                        </p>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 md:gap-2 pt-1 md:pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-[#10b981]/30 hover:bg-[#10b981]/10 hover:border-[#10b981]/50 text-xs h-7 md:h-8"
                          onClick={() => router.push('/dashboard/clientes')}
                        >
                          <User className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Ver Cliente</span>
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[#10b981] hover:bg-[#059669] text-xs h-7 md:h-8"
                          onClick={() => handleCompleteAppointment(item.nextAppointment)}
                          disabled={isCompletingAppointment}
                        >
                          <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{isCompletingAppointment ? "..." : "Concluir"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mostrar profissionais livres se existirem */}
            {professionals.filter((prof: any) => !nextAppointmentsByProfessional.find((item: any) => item.professional.id === prof.id)).length > 0 && (
              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[#27272a]">
                <p className="text-xs md:text-sm text-[#a1a1aa] mb-2">Profissionais livres:</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {professionals
                    .filter((prof: any) => !nextAppointmentsByProfessional.find((item: any) => item.professional.id === prof.id))
                    .map((prof: any) => (
                      <Badge key={prof.id} variant="outline" className="border-[#27272a] text-[#a1a1aa] text-xs">
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
          <CardHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-3 md:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                <CardTitle className="text-[#ededed] text-base md:text-lg lg:text-xl">O que vem a seguir?</CardTitle>
              </div>
              <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 text-xs md:text-sm self-start sm:self-center">
                Próximo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <span className="text-lg md:text-xl lg:text-2xl font-bold text-[#10b981]">{nextAppointment.time}</span>
                  <span className="text-xs md:text-sm text-[#a1a1aa]">{nextAppointment.date}</span>
                </div>
                <p className="text-base md:text-lg font-semibold text-[#ededed] truncate">{nextAppointment.client}</p>
                <p className="text-xs md:text-sm text-[#a1a1aa] line-clamp-2">
                  {nextAppointment.service} 
                  {nextAppointment.professional && ` com ${nextAppointment.professional}`}
                  <span className="ml-2 text-xs">({nextAppointment.duration} min)</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-[#10b981]/30 hover:bg-[#10b981]/10 hover:border-[#10b981]/50 text-xs md:text-sm h-8 md:h-9"
                  onClick={() => router.push('/dashboard/clientes')}
                >
                  <User className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Ver Histórico
                </Button>
                <Button 
                  size="sm" 
                  className="bg-[#10b981] hover:bg-[#059669] text-xs md:text-sm h-8 md:h-9"
                  onClick={() => handleCompleteAppointment(nextAppointment)}
                  disabled={isCompletingAppointment}
                >
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  {isCompletingAppointment ? "Concluindo..." : "Concluir"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Agenda de Hoje - 2 colunas */}
        <div className="xl:col-span-2">
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-3 md:pb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="text-[#a1a1aa] flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#10b981]" />
                  Agenda de Hoje
                </CardTitle>
                <div className="flex items-center gap-2 md:gap-3">
                  <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 text-xs">
                    {todayAppointments.length} agendamentos
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard/agenda')}
                    className="border-[#27272a] hover:bg-[#27272a] text-xs md:text-sm h-7 md:h-8"
                  >
                    Ver Todos
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="space-y-2 md:space-y-3">
                {todayAppointments.length > 0 ? (
                  todayAppointments.slice(0, 6).map((appointment: any, index: number) => (
                    <div key={index} className="bg-[#0a0a0a]/50 rounded-lg p-3 md:p-4 border border-[#27272a] hover:border-[#10b981]/30 transition-colors">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
                            <span className="text-base md:text-lg font-semibold text-[#ededed]">{appointment.time}</span>
                            <Badge
                              className={`text-xs self-start sm:self-center flex-shrink-0 ${
                                appointment.status === "COMPLETED"
                                  ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                                  : appointment.status === "IN_PROGRESS"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {appointment.status === "COMPLETED"
                                ? "Concluído"
                                : appointment.status === "IN_PROGRESS"
                                ? "Em andamento"
                                : "Confirmado"}
                            </Badge>
                          </div>
                          <p className="text-[#ededed] font-medium text-sm md:text-base truncate">{appointment.client}</p>
                          <p className="text-xs md:text-sm text-[#a1a1aa] line-clamp-2">
                            {appointment.service}
                            {appointment.professional && ` • ${appointment.professional}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 md:py-8 text-[#a1a1aa]">
                    <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-[#71717a]" />
                    <h3 className="text-base md:text-lg font-medium text-[#ededed] mb-1">Nenhum agendamento para hoje</h3>
                    <p className="text-xs md:text-sm">Que tal aproveitar para planejar o amanhã?</p>
                    <Button 
                      className="mt-3 bg-[#10b981] hover:bg-[#059669] text-xs md:text-sm h-8 md:h-9"
                      onClick={() => router.push('/dashboard/agenda')}
                    >
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Criar Agendamento
                    </Button>
                  </div>
                )}
                {todayAppointments.length > 6 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push('/dashboard/agenda')}
                      className="text-[#10b981] hover:bg-[#10b981]/10 text-xs md:text-sm h-7 md:h-8"
                    >
                      Ver mais {todayAppointments.length - 6} agendamentos
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral */}
        <div className="space-y-4 md:space-y-6">
          {/* Taxa de Ocupação por Profissional */}
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-[#a1a1aa] text-sm md:text-base font-semibold flex items-center gap-2">
                <Users className="w-3 h-3 md:w-4 md:h-4 text-[#10b981]" />
                Ocupação por Profissional
              </CardTitle>
              <CardDescription className="text-[#a1a1aa] text-xs">Distribuição de agendamentos hoje</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="space-y-3 md:space-y-4">
                {professionals.length > 0 ? (
                  professionals.map((prof: any) => (
                    <div key={prof.id} className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <span className="text-[#ededed] font-medium truncate flex-1 pr-2">{prof.name}</span>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          <span className="text-[#a1a1aa] text-xs">{prof.appointmentsToday || 0} agend.</span>
                          <span className="text-[#10b981] font-semibold text-xs md:text-sm">{prof.occupancyRate || 0}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={prof.occupancyRate || 0} 
                        className="h-1.5 md:h-2 bg-[#27272a]"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 md:py-4 text-[#a1a1aa]">
                    <Users className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-[#71717a]" />
                    <p className="text-xs md:text-sm">Nenhum profissional cadastrado</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-[#27272a] hover:bg-[#27272a] text-xs h-7 md:h-8"
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
            <CardHeader className="pb-3 md:pb-4 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-[#a1a1aa] text-sm md:text-base font-semibold">Ações Rápidas</CardTitle>
              <CardDescription className="text-[#a1a1aa] text-xs">Acesso rápido às principais funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button 
                  onClick={handleNewClient}
                  className="group relative p-3 md:p-4 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Novo Cliente</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleSchedule}
                  className="group relative p-3 md:p-4 bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 rounded-xl hover:from-[#10b981]/20 hover:to-[#10b981]/10 hover:border-[#10b981]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#10b981] transition-colors">Agendar</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleFinancial}
                  className="group relative p-3 md:p-4 bg-gradient-to-br from-[#fbbf24]/10 to-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl hover:from-[#fbbf24]/20 hover:to-[#fbbf24]/10 hover:border-[#fbbf24]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-[#ededed] group-hover:text-[#fbbf24] transition-colors">Financeiro</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleReports}
                  className="group relative p-3 md:p-4 bg-gradient-to-br from-[#3f3f46]/10 to-[#3f3f46]/5 border border-[#27272a] rounded-xl hover:from-[#3f3f46]/20 hover:to-[#3f3f46]/10 hover:border-[#3f3f46]/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#3f3f46] to-[#27272a] rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
