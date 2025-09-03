"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Users, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight, User, MapPin, Zap } from "lucide-react"
import { useDashboard } from "@/hooks/use-api"
import { useAppointments } from "@/hooks/use-api"
import { useBusinessData } from "@/hooks/use-business-data"
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
  const { businessData } = useBusinessData()
  const { toast } = useToast()
  const router = useRouter()

  // Componente para foto do profissional com fallback
  const ProfessionalAvatar = ({ professional, size = "w-10 h-10" }: { professional: any, size?: string }) => {
    const [imageError, setImageError] = useState(false)
    
    if (professional.avatar && !imageError) {
      return (
  <div className={`${size} rounded-full overflow-hidden bg-primary flex-shrink-0`}>
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
  <div className={`${size} bg-primary rounded-full flex items-center justify-center flex-shrink-0`}>
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao concluir agendamento:', error)
      }
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando dados...</p>
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

  // Padronização: todos os ícones e sparklines usam cor neutra tymer-icon
  const colorMap = {
    revenue: { icon: 'text-tymer-icon', spark: '#9d9d9d' },
    clients: { icon: 'text-tymer-icon', spark: '#9d9d9d' },
    appointments: { icon: 'text-tymer-icon', spark: '#9d9d9d' },
    occupancy: { icon: 'text-tymer-icon', spark: '#9d9d9d' }
  } as const

  const stats = [
    {
      key: 'revenue',
      title: "Faturamento Hoje",
      value: dashboardData?.summary?.revenue ?
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dashboardData.summary.revenue) :
        "R$ 0,00",
      icon: DollarSign,
      color: colorMap.revenue.icon,
      sparklineData: sparklines.revenue,
      sparkColor: colorMap.revenue.spark,
    },
    {
      key: 'clients',
      title: "Clientes Ativos",
      value: dashboardData?.summary?.totalClients?.toString() || "0",
      icon: Users,
      color: colorMap.clients.icon,
      sparklineData: sparklines.clients,
      sparkColor: colorMap.clients.spark,
    },
    {
      key: 'appointments',
      title: "Agendamentos Hoje",
      value: (dashboardData?.todayAppointments?.length || 0).toString(),
      icon: Calendar,
      color: colorMap.appointments.icon,
      sparklineData: sparklines.appointments,
      sparkColor: colorMap.appointments.spark,
    },
    {
      key: 'occupancy',
      title: "Taxa de Ocupação",
      value: `${Math.round(dashboardData?.summary?.occupancyRate || 0)}%`,
      icon: TrendingUp,
      color: colorMap.occupancy.icon,
      sparklineData: sparklines.appointments,
      sparkColor: colorMap.occupancy.spark,
    },
  ]

  const todayAppointments = dashboardData?.todayAppointments || []
  const nextAppointment = dashboardData?.nextAppointment
  const nextAppointmentsByProfessional = dashboardData?.nextAppointmentsByProfessional || []
  const professionals = dashboardData?.professionals || []

  // Debug detalhado
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dashboard data recebido:', dashboardData)
    console.log('🔍 Today appointments:', todayAppointments)
    console.log('🔍 Next appointment:', nextAppointment)
    console.log('🔍 Next appointments by professional:', nextAppointmentsByProfessional)
    console.log('🔍 Professionals with avatars:', professionals)
    console.log('🔍 Summary:', dashboardData?.summary)
    console.log('🔍 Sparklines data:', dashboardData?.sparklines)
    console.log('🔍 Sparklines revenue:', sparklines.revenue)
    console.log('🔍 Sparklines appointments:', sparklines.appointments)
    console.log('🔍 Sparklines clients:', sparklines.clients)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">Olá, {businessData?.name || "Estabelecimento"}! </h1>
        <p className="text-muted-foreground capitalize text-sm sm:text-base lg:text-lg">{today}</p>
      </div>

      {/* Stats Cards com Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-3 lg:p-3">
              <CardTitle className="text-sm sm:text-sm lg:text-base font-medium text-foreground leading-tight">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 sm:h-4 sm:w-4 lg:h-5 lg:w-5 ${stat.color} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-3 lg:p-3 pt-0">
              <div className="text-center space-y-2 sm:space-y-2 lg:space-y-2">
                <div className="text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="flex justify-center">
                  <Sparkline
                    data={stat.sparklineData}
                    color={stat.sparkColor}
                    width={60}
                    height={20}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Próximos Agendamentos por Profissional */}
      {nextAppointmentsByProfessional.length > 0 && (
        <Card className="bg-primary/10 border border-primary/30">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <CardTitle className="text-foreground text-base sm:text-lg lg:text-xl">Próximos na Fila</CardTitle>
                </div>
                <Badge className="sm:hidden bg-tymer-balon text-tymer-textgray border-tymer-textgray/30 text-xs">
                  {nextAppointmentsByProfessional.length} profissionais
                </Badge>
              </div>
              <Badge className="hidden sm:block bg-tymer-balon text-tymer-textgray border-tymer-textgray/30 text-xs lg:text-sm">
                {nextAppointmentsByProfessional.length} profissionais
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {nextAppointmentsByProfessional.map((item: any) => (
                <div key={item.professional.id} className="bg-[#0a0a0a]/50 rounded-lg p-3 sm:p-4 border border-border hover:border-primary/50 transition-colors">
                  <div className="space-y-2 sm:space-y-3">
                    {/* Header do Profissional */}
                    <div className="flex items-center gap-3">
                      <ProfessionalAvatar professional={item.professional} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#ededed] text-sm lg:text-base">{item.professional.name}</h4>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-xs lg:text-sm text-[#a1a1aa]">Próximo</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Informações do Agendamento */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">{item.nextAppointment.time}</span>
                        <Badge
                          className={`text-xs lg:text-sm ${
                            item.nextAppointment.status === "IN_PROGRESS"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {item.nextAppointment.status === "IN_PROGRESS" ? "Em andamento" : "Confirmado"}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="font-medium text-[#ededed] text-sm lg:text-base">{item.nextAppointment.client}</p>
                        <p className="text-xs lg:text-sm text-[#a1a1aa]">
                          {item.nextAppointment.service}
                          <span className="ml-1">({item.nextAppointment.duration} min)</span>
                        </p>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-xs lg:text-sm"
                          onClick={() => router.push('/dashboard/clientes')}
                        >
                          <User className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Ver Cliente</span>
                          <span className="sm:hidden">Ver Cliente</span>
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground text-xs lg:text-sm"
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
                                <Badge
                                  key={prof.id}
                                  className="bg-tymer-balon text-tymer-textgray border-tymer-textgray/30 text-xs font-medium px-3 py-1 rounded-full"
                                >
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
  <Card className="bg-primary/10 border border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <CardTitle className="text-foreground text-lg">O que vem a seguir?</CardTitle>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Próximo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold text-primary">{nextAppointment.time}</span>
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
                  className="border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => router.push('/dashboard/clientes')}
                >
                  <User className="w-4 h-4 mr-1" />
                  Ver Histórico
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/80 text-primary-foreground"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Agenda de Hoje - 2 colunas */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                <CardTitle className="text-foreground flex items-center gap-2 text-base sm:text-lg lg:text-xl">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-foreground" />
                  Agenda de Hoje
                </CardTitle>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge className="bg-tymer-balon text-tymer-textgray border-tymer-textgray/30 text-xs lg:text-sm">
                    {todayAppointments.length} agendamentos
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard/agenda')}
                    className="border-[#27272a] hover:bg-[#27272a] text-xs sm:text-sm lg:text-base px-2 sm:px-3"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Ver Todos</span>
                    <span className="sm:hidden">Ver Agendamentos</span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {todayAppointments.length > 0 ? (
                  todayAppointments.slice(0, 6).map((appointment: any, index: number) => (
                    <div key={index} className="bg-[#0a0a0a]/50 rounded-lg p-3 sm:p-4 border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base sm:text-lg lg:text-xl font-semibold text-[#ededed]">{appointment.time}</span>
                            <Badge
                              className={`text-xs lg:text-sm ${
                                appointment.status === "COMPLETED"
                                  ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                                  : appointment.status === "IN_PROGRESS"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {appointment.status === "COMPLETED"
                                ? "Concluído"
                                : appointment.status === "IN_PROGRESS"
                                ? "Em andamento"
                                : "Confirmado"}
                            </Badge>
                          </div>
                          <p className="text-[#ededed] font-medium text-sm sm:text-base lg:text-lg truncate">{appointment.client}</p>
                          <p className="text-xs sm:text-sm lg:text-base text-[#a1a1aa] truncate">
                            {appointment.service}
                            {appointment.professional && ` • ${appointment.professional}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8 text-[#a1a1aa]">
                    <Calendar className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 mx-auto mb-3 text-[#71717a]" />
                    <h3 className="text-base sm:text-lg lg:text-xl font-medium text-[#ededed] mb-1">Nenhum agendamento para hoje</h3>
                    <p className="text-xs sm:text-sm lg:text-base">Que tal aproveitar para planejar o amanhã?</p>
                    <Button 
                      className="mt-3 bg-primary hover:bg-primary/80 text-primary-foreground text-xs sm:text-sm lg:text-base px-3 sm:px-4"
                      onClick={() => router.push('/dashboard/agenda')}
                    >
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Criar Agendamento
                    </Button>
                  </div>
                )}
                {todayAppointments.length > 6 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push('/dashboard/agenda')}
                      className="text-primary hover:bg-primary/10"
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-base lg:text-lg font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" />
                Ocupação por Profissional
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs lg:text-sm">Distribuição de agendamentos hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionals.length > 0 ? (
                  professionals.map((prof: any) => (
                    <div key={prof.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm lg:text-base">
                        <span className="text-[#ededed] font-medium">{prof.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#a1a1aa]">{prof.appointmentsToday || 0} agend.</span>
                          <span className="text-primary font-semibold">{prof.occupancyRate || 0}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={prof.occupancyRate || 0} 
                        className="h-2 bg-[#27272a] [&>div]:bg-primary"
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-base lg:text-lg font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-foreground" />
                Ações Rápidas
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs lg:text-sm">Acesso rápido às principais funcionalidades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleNewClient}
                  className="group relative p-4 bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/25 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-foreground">Novo Cliente</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleSchedule}
                  className="group relative p-4 bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/25 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-foreground">Agendar</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleFinancial}
                  className="group relative p-4 bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/25 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-foreground">Financeiro</p>
                  </div>
                </button>
                
                <button 
                  onClick={handleReports}
                  className="group relative p-4 bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/25 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-foreground">Relatórios</p>
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
