"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Users, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight, User, MapPin, Zap, Smartphone, CreditCard, Star } from "lucide-react"
import { useDashboard } from "@/hooks/use-api"
import { useAppointments } from "@/hooks/use-api"
import { useBusinessData } from "@/hooks/use-business-data"
import { Sparkline } from "@/components/ui/sparkline"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { PaymentMethodModal } from "@/components/ui/payment-method-modal"
import { ProductSaleModal } from "@/components/ui/product-sale-modal"

function CollaboratorProductsWidget() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commission, setCommission] = useState(0)
  const [top, setTop] = useState<Array<{ name: string; quantity?: number }>>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const profId = u ? (JSON.parse(u)?.professionalId) : null
        if (!profId) { setLoading(false); return }
        const res = await fetch(`/api/reports?type=profitability&professionalId=${encodeURIComponent(profId)}`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.message || 'Erro ao carregar')
        const p = json?.data?.profitability || {}
        setCommission(Number(p?.productCommissions || 0))
        const list = Array.isArray(json?.data?.topProfitableProducts) ? json.data.topProfitableProducts : []
        setTop(list.slice(0, 5))
      } catch (e: any) {
        setError(e?.message || 'Erro')
        setCommission(0)
        setTop([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="text-[#71717a] text-sm">Carregando…</div>
  if (error) return <div className="text-red-400 text-sm">{error}</div>

  return (
    <div className="space-y-3">
      <div className="text-2xl font-bold text-[#ededed]">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission)}
      </div>
      <div>
        <p className="text-sm text-[#a1a1aa] mb-2">Meus Produtos Mais Vendidos</p>
        {top.length === 0 ? (
          <p className="text-xs text-[#71717a]">Sem vendas de produtos no período</p>
        ) : (
          <div className="space-y-2">
            {top.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#ededed] truncate pr-2">{p.name}</span>
                <span className="text-[#a1a1aa]">{p.quantity || 0}x</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isProductSaleOpen, setIsProductSaleOpen] = useState(false)
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

  const handleQuickProductSale = () => {
    setIsProductSaleOpen(true)
  }

  // Função para abrir modal de pagamento (com verificação de cobertura igual à Agenda)
  const handleCompleteAppointment = async (appointment: any) => {
    let coverageInfo: { covered: boolean; coveredBy?: 'subscription' | 'package'; packageName?: string } | undefined
    try {
      if (appointment?.id) {
        const res = await fetch('/api/coverage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: appointment.id })
        })
        if (res.ok) {
          const coverage = await res.json()
          if (coverage?.covered) {
            coverageInfo = {
              covered: true,
              coveredBy: coverage.coveredBy,
              packageName: coverage.packageName
            }
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Erro ao buscar cobertura (dashboard):', err)
      }
    }

    // Anexar coverageInfo ao objeto usado pelo modal (sem alterar o shape esperado)
    const modalAppt = { ...appointment, coverageInfo }
    setAppointmentToComplete(modalAppt)
    setIsPaymentModalOpen(true)
  }

  // Função para concluir agendamento com forma de pagamento e (opcional) produtos vendidos
  const handleCompleteWithPayment = async ({ paymentMethod, soldProducts }: { paymentMethod: string, soldProducts: Array<{ productId: string, quantity: number }> }) => {
    if (!appointmentToComplete) return
    setIsCompletingAppointment(true)
    try {
      await updateAppointment({
        id: appointmentToComplete.id,
        status: 'COMPLETED',
        paymentMethod,
        paymentStatus: 'PAID',
        soldProducts
      })
      toast({
        title: "✅ Sucesso",
        description: soldProducts?.length ? "Agendamento concluído com venda de produto registrada!" : "Agendamento concluído e pagamento registrado!",
      })
      setIsPaymentModalOpen(false)
      setAppointmentToComplete(null)
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1">Olá, {businessData?.name || "Estabelecimento"}! </h1>
        {/* Email do colaborador abaixo do nome do estabelecimento */}
        {user?.role === 'COLLABORATOR' && user?.email && (
          <p className="text-xs sm:text-sm text-[#a1a1aa] mb-1 break-all">{user.email}</p>
        )}
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
                            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                              {/* Badge de forma de pagamento quando concluído */}
                              {appointment.status === 'COMPLETED' && (() => {
                                const pm = appointment?.paymentMethod as string | undefined
                                let label = 'Pagamento'
                                let color = 'bg-zinc-700/20 text-zinc-300 border-zinc-600/30'
                                let Icon: any = null
                                if (pm === 'CASH') { label = 'Dinheiro'; color = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'; Icon = DollarSign }
                                else if (pm === 'PIX') { label = 'PIX'; color = 'bg-teal-500/15 text-teal-300 border-teal-500/30'; Icon = Smartphone }
                                else if (pm === 'CARD') { label = 'Cartão'; color = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'; Icon = CreditCard }
                                else if (pm === 'PREPAID') { label = 'Pré‑pago'; color = 'bg-purple-500/15 text-purple-300 border-purple-500/30'; Icon = Star }
                                return (
                                  <Badge className={`text-xs lg:text-sm border flex items-center gap-1 ${color}`}>
                                    {Icon ? <Icon className="w-3 h-3" /> : null}
                                    {label}
                                  </Badge>
                                )
                              })()}
                            </div>
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
                  onClick={handleQuickProductSale}
                  className="group relative p-4 bg-primary/20 border border-primary/30 rounded-xl hover:bg-primary/25 hover:border-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-foreground">Venda de Produto</p>
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

          {/* Colaborador: Produtos e Comissões */}
          {user?.role === 'COLLABORATOR' && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground text-base lg:text-lg font-semibold">Minhas Comissões de Produtos</CardTitle>
                <CardDescription className="text-muted-foreground text-xs lg:text-sm">Comissões geradas por vendas de produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <CollaboratorProductsWidget />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Forma de Pagamento */}
      <PaymentMethodModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setAppointmentToComplete(null)
        }}
        onSelectPayment={(method) => handleCompleteWithPayment({ paymentMethod: method, soldProducts: [] })}
        enableProductSelection
        onComplete={handleCompleteWithPayment}
        appointmentData={appointmentToComplete ? {
          id: appointmentToComplete.id,
          client: appointmentToComplete.client,
          service: appointmentToComplete.service,
          totalPrice: appointmentToComplete.totalPrice || 0,
          time: appointmentToComplete.time
        } : undefined}
        coverageInfo={(appointmentToComplete as any)?.coverageInfo}
        isLoading={isCompletingAppointment}
      />

      {/* Modal: Registrar Venda de Produto */}
      <ProductSaleModal
        isOpen={isProductSaleOpen}
        onClose={() => setIsProductSaleOpen(false)}
        onSuccess={async () => {
          toast({ title: "✅ Sucesso", description: "Venda registrada!" })
          await fetchDashboardData('today')
        }}
        professionals={(dashboardData?.professionals || []).map((p: any) => ({ id: p.id, name: p.name }))}
      />
    </div>
  )
}
