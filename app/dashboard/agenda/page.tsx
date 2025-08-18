"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Check,
  X,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
} from "lucide-react"
import { useProfessionals } from "@/hooks/use-api"
import { useAppointments, useClients, useServices, useEstablishment } from "@/hooks/use-api"
import { useWorkingHours } from "@/hooks/use-working-hours"
import { useToast } from "@/hooks/use-toast"
import { formatBrazilTime, getBrazilDayOfWeek, getBrazilDayNameEn, debugTimezone, parseDateTime, toLocalISOString, toLocalDateString, parseDatabaseDateTime, extractTimeFromDateTime } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { PaymentMethodModal } from "@/components/ui/payment-method-modal"
import { useAgendaAvailability } from "@/hooks/use-agenda-availability"
import { ProfessionalScheduleStatus } from "@/components/professional-schedule-status"

// 🚀 FEATURE FLAG: Habilitar regras de professional schedules
const ENABLE_PROFESSIONAL_SCHEDULES = process.env.NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES === 'true'

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState("todos")
  const [selectedStatus, setSelectedStatus] = useState("todos")
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [appointmentToComplete, setAppointmentToComplete] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'complete' | 'cancel' | 'delete' | null
    appointmentId: string
    clientName: string
    serviceName: string
  }>({
    isOpen: false,
    type: null,
    appointmentId: '',
    clientName: '',
    serviceName: ''
  })
  const [newAppointment, setNewAppointment] = useState({
    endUserId: "",
    professionalId: "",
    serviceId: "",
    date: "",
    time: "",
    notes: ""
  })
  const [editingAppointment, setEditingAppointment] = useState<any>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  
  // 🚀 NOVO: Estado para slots disponíveis (para evitar chamadas assíncronas na UI)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
  
  // Estados para pesquisa de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  
  // Hooks para dados reais do banco de dados
  const { appointments, loading: appointmentsLoading, error: appointmentsError, fetchAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointments()
  const { clients, loading: clientsLoading, error: clientsError, fetchClients } = useClients()
  const { services, loading: servicesLoading, error: servicesError, fetchServices } = useServices()
  const { professionals: professionalsData, loading: professionalsLoading, fetchProfessionals } = useProfessionals()
  const { establishment, loading: establishmentLoading, fetchEstablishment } = useEstablishment()
  const { 
    workingHours, 
    loading: workingHoursLoading, 
    error: workingHoursError, 
    fetchWorkingHours,
    getWorkingHoursForDay,
    isEstablishmentOpen,
    isTimeWithinWorkingHours 
  } = useWorkingHours()
  const { toast } = useToast()
  
  // 🚀 NOVO: Hook para disponibilidade com regras de profissional
  const {
    getProfessionalAvailableSlots,
    checkProfessionalSchedule,
    initializeBusinessSlug,
    isReady: agendaAvailabilityReady,
    isLoading: agendaAvailabilityLoading,
    error: agendaAvailabilityError,
    businessSlug
  } = useAgendaAvailability()

  // Função para refresh manual de dados
  const handleRefreshData = async () => {
    setIsRefreshing(true)
    try {
      const currentDateString = toLocalDateString(currentDate)
      const professionalParam = selectedProfessional === "todos" ? undefined : selectedProfessional
      const statusParam = selectedStatus === "todos" ? undefined : selectedStatus
      
      await Promise.allSettled([
        fetchAppointments(currentDateString, statusParam, professionalParam),
        fetchClients(),
        fetchServices(),
        fetchProfessionals(),
        fetchEstablishment(),
        fetchWorkingHours()
      ])
      
      setLastUpdated(new Date())
      
      toast({
        title: "✅ Dados Atualizados",
        description: "Informações da agenda foram atualizadas com sucesso!",
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar dados:', error)
      }
      }
      toast({
        title: "❌ Erro ao Atualizar",
        description: "Erro ao atualizar dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Carregar dados ao montar o componente
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.allSettled([
          fetchAppointments(),
          fetchClients(),
          fetchServices(),
          fetchProfessionals(),
          fetchEstablishment(),
          fetchWorkingHours(),
          // 🚀 NOVO: Inicializar business slug para regras de profissional
          ENABLE_PROFESSIONAL_SCHEDULES ? initializeBusinessSlug() : Promise.resolve()
        ])
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao carregar dados:', error)
        }
        }
      }
    }
    
    loadData()
  }, []) // Sem dependências para executar apenas uma vez

  // Debug para verificar se os dados estão chegando (apenas uma vez)
  useEffect(() => {
    if (appointments && clients && services && professionalsData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Todos os dados carregados:', {
          appointments: appointments?.length || 0,
          clients: clients?.length || 0,
          services: services?.length || 0,
          professionals: professionalsData?.length || 0
        })
      }
    }
  }, [appointments?.length, clients?.length, services?.length, professionalsData?.length])

  // Limpar horário quando serviço, data ou profissional mudam (mas NÃO quando estamos editando)
  useEffect(() => {
    // 🔧 CORREÇÃO: Não limpar horário quando estamos editando um agendamento
    if (!editingAppointment && (newAppointment.serviceId || newAppointment.date || newAppointment.professionalId)) {
      setNewAppointment(prev => {
        // Só limpar o time se ele já não estiver vazio (evita loop infinito)
        if (prev.time !== "") {
          return {...prev, time: ""}
        }
        return prev
      })
      // Limpar erro do backend quando dados importantes mudam
      setBackendError(null)
    }
  }, [newAppointment.serviceId, newAppointment.date, newAppointment.professionalId, editingAppointment])

  // Limpar erro do backend quando modal é aberto
  useEffect(() => {
    if (isNewAppointmentOpen) {
      setBackendError(null)
    }
  }, [isNewAppointmentOpen])

  // ✅ Recarregar dados quando filtros mudarem (profissional, data, status)
  useEffect(() => {
    const loadFilteredData = async () => {
      try {
        // Formatar data atual para enviar para API
        const currentDateString = toLocalDateString(currentDate)
        
        // Preparar parâmetros para a API
        const professionalParam = selectedProfessional === "todos" ? undefined : selectedProfessional
        const statusParam = selectedStatus === "todos" ? undefined : selectedStatus
        
        // Buscar agendamentos filtrados
        await fetchAppointments(currentDateString, statusParam, professionalParam)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao carregar dados filtrados:', error)
        }
      }
    }
    
    loadFilteredData()
  }, [selectedProfessional, selectedStatus, currentDate]) // Removido fetchAppointments para evitar loop

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClientDropdownOpen) {
        const target = event.target as Element
        if (!target.closest('[data-client-dropdown]')) {
          setIsClientDropdownOpen(false)
        }
      }
    }

    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isClientDropdownOpen])

  // Prevenir scroll do body quando modal está aberto
  useEffect(() => {
    if (isNewAppointmentOpen) {
      // Impedir scroll do body
      document.body.style.overflow = 'hidden'
      // Adicionar padding para compensar a barra de scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      // Restaurar scroll do body
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }

    // Cleanup: sempre restaurar quando componente desmonta
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }
  }, [isNewAppointmentOpen])

  // 🚀 NOVO: useEffect para atualizar slots disponíveis automaticamente
  useEffect(() => {
    const updateAvailableSlots = async () => {
      if (!newAppointment.serviceId || !newAppointment.date) {
        setAvailableTimeSlots([])
        return
      }

      setLoadingTimeSlots(true)
      try {
        const slots = await getAvailableTimeSlots(editingAppointment?.id)
        setAvailableTimeSlots(slots)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao atualizar slots:', error)
        }
        setAvailableTimeSlots([])
      } finally {
        setLoadingTimeSlots(false)
      }
    }

    updateAvailableSlots()
  }, [newAppointment.serviceId, newAppointment.date, newAppointment.professionalId, editingAppointment?.id])

  // Função para gerar horários baseado nos horários de funcionamento específicos por dia
  const generateTimeSlotsForDate = (date: Date) => {
    try {
      const slots = []
      
      // Verificar se o estabelecimento está aberto no dia
      if (!isEstablishmentOpen(date)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Estabelecimento fechado em ${date.toDateString()}`)
        }
        return []
      }
      
      // Obter horários específicos do dia
      const dayConfig = getWorkingHoursForDay(date)
      
      if (!dayConfig.isOpen || !dayConfig.startTime || !dayConfig.endTime) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Configuração inválida para ${date.toDateString()}:`, dayConfig)
        }
        return []
      }
      
      // Validar formato de horários
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(dayConfig.startTime) || !timeRegex.test(dayConfig.endTime)) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`🚫 Formato de horário inválido:`, dayConfig)
        }
        return []
      }
      
      // Converter horários para números
      const [startHour, startMinute] = dayConfig.startTime.split(':').map(Number)
      const [endHour, endMinute] = dayConfig.endTime.split(':').map(Number)
      
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      // Validar se horário de início é menor que fim
      if (startTotalMinutes >= endTotalMinutes) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`🚫 Horário de início deve ser menor que fim:`, dayConfig)
        }
        return []
      }
      
      const interval = 5 // Intervalos de 5 minutos
      
      // Gerar slots apenas dentro do horário de funcionamento
      for (let currentMinutes = startTotalMinutes; currentMinutes < endTotalMinutes; currentMinutes += interval) {
        const hour = Math.floor(currentMinutes / 60)
        const minute = currentMinutes % 60
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Gerados ${slots.length} slots para ${date.toDateString()}:`, {
          funcionamento: `${dayConfig.startTime} - ${dayConfig.endTime}`,
          primeiros3: slots.slice(0, 3),
          ultimos3: slots.slice(-3)
        })
      }
      
      return slots
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 Erro ao gerar slots de horário:', error)
      }
      return []
    }
  }

  // Função para gerar horários (baseado nos horários de funcionamento do estabelecimento) - mantida para compatibilidade
  const generateTimeSlots = () => {
    return generateTimeSlotsForDate(currentDate)
  }

  // Função para filtrar clientes baseada na pesquisa
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) {
      return clients
    }
    
    const searchLower = clientSearchTerm.toLowerCase()
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    )
  }, [clients, clientSearchTerm])

  // 🇧🇷 OTIMIZADO: Obter agendamentos do dia atual (sem conversões UTC) usando useMemo
  const todayAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Parse seguro do dateTime do banco (sem conversão UTC automática)
      const aptDate = parseDatabaseDateTime(apt.dateTime || apt.date)
      const aptDateString = toLocalDateString(aptDate) // YYYY-MM-DD
      const currentDateString = toLocalDateString(currentDate) // YYYY-MM-DD
      
      return aptDateString === currentDateString
    })
  }, [appointments, currentDate]) // Dependências: só recalcula quando appointments ou currentDate mudam

  // 🇧🇷 OTIMIZADO: Função para verificar se um horário está ocupado usando useCallback
  const isTimeSlotOccupied = useCallback((time: string, professionalId?: string, excludeAppointmentId?: string) => {
    return todayAppointments.some(apt => {
      // 🚫 CORREÇÃO CRÍTICA: Excluir agendamentos cancelados da verificação de ocupação
      if (apt.status === 'CANCELLED' || apt.status === 'cancelled') {
        return false // Agendamentos cancelados não ocupam horários
      }
      
      // 🔧 CORREÇÃO: Excluir o agendamento sendo editado da verificação de conflito
      if (excludeAppointmentId && apt.id === excludeAppointmentId) {
        return false // Não considerar o próprio agendamento como conflito
      }
      
      // Parse seguro do dateTime do banco (sem conversão UTC automática)
      const aptDateTime = parseDatabaseDateTime(apt.dateTime || `${apt.date} ${apt.time}`)
      const aptStartTimeString = extractTimeFromDateTime(apt.dateTime) // HH:mm sem UTC
      
      // 🇧🇷 CORREÇÃO: Usar apt.duration diretamente (já salvo no agendamento) 
      // ou calcular da soma dos serviços se não existir
      let appointmentDuration = apt.duration
      if (!appointmentDuration && apt.services?.length > 0) {
        appointmentDuration = apt.services.reduce((total: number, service: any) => total + (service.duration || 0), 0)
      }
      const serviceDuration = appointmentDuration || 30 // fallback para 30 min
      
      // Calcular horário de fim do agendamento (em timezone brasileiro)
      const aptEndTimeBrazil = new Date(aptDateTime.getTime() + (serviceDuration * 60000))
      const aptEndTimeString = `${String(aptEndTimeBrazil.getHours()).padStart(2, '0')}:${String(aptEndTimeBrazil.getMinutes()).padStart(2, '0')}`
      
      // Converter horários para minutos para facilitar comparação
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const slotMinutes = timeToMinutes(time)
      const aptStartMinutes = timeToMinutes(aptStartTimeString)
      const aptEndMinutes = timeToMinutes(aptEndTimeString)
      
      // Verificar se o slot está dentro do período do agendamento
      const isWithinAppointment = slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes
      
      // Verificar filtro de profissional
      const matchesProfessional = !professionalId || apt.professionalId === professionalId
      
      return isWithinAppointment && matchesProfessional
    })
  }, [todayAppointments]) // Dependência: só recalcula quando todayAppointments muda

  // Função robusta para verificar conflitos de agendamento
  const hasConflict = (appointmentData: {
    date: string
    time: string
    serviceId: string
    professionalId?: string
  }) => {
    try {
      const { date, time, serviceId, professionalId } = appointmentData
      
      // Validar dados de entrada
      if (!date || !time || !serviceId) return true
      
      // Obter serviço selecionado
      const selectedService = services.find(s => s.id === serviceId)
      if (!selectedService) return true
      
      const serviceDuration = selectedService.duration || 30
      
      // Converter para formato consistente (ISO)
      const [year, month, day] = date.split('-').map(Number)
      const [hours, minutes] = time.split(':').map(Number)
      
      const newStartTime = new Date(year, month - 1, day, hours, minutes, 0)
      const newEndTime = new Date(newStartTime.getTime() + (serviceDuration * 60000))
      
      // Filtrar agendamentos da mesma data que não estão cancelados
      const dayAppointments = appointments.filter(apt => {
        if (!apt.dateTime) return false
        if (apt.status === 'CANCELLED' || apt.status === 'cancelled') return false
        
        // Ignorar o próprio agendamento em caso de edição
        if (editingAppointment && apt.id === editingAppointment.id) return false
        
        const aptDate = parseDatabaseDateTime(apt.dateTime)
        return aptDate.toDateString() === newStartTime.toDateString()
      })
      
      // Verificar conflitos
      return dayAppointments.some(existingApt => {
        const existingStartTime = parseDatabaseDateTime(existingApt.dateTime)
        const existingServiceDuration = existingApt.duration || 30
        const existingEndTime = new Date(existingStartTime.getTime() + (existingServiceDuration * 60000))
        
        // Verificar sobreposição de horários
        const hasTimeOverlap = (newStartTime < existingEndTime) && (newEndTime > existingStartTime)
        
        // Se não há profissional especificado, verificar apenas sobreposição geral
        if (!professionalId) {
          return hasTimeOverlap
        }
        
        // Se há profissional especificado, verificar conflito apenas com o mesmo profissional
        if (existingApt.professionalId && professionalId === existingApt.professionalId) {
          return hasTimeOverlap
        }
        
        return false
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao verificar conflitos:', error)
      }
      return true // Em caso de erro, considerar como conflito para segurança
    }
  }

  // Função para verificar se é possível agendar um serviço em determinado horário
  const canScheduleService = (time: string, serviceDuration: number, professionalId?: string, excludeAppointmentId?: string) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const startMinutes = timeToMinutes(time)
    const endMinutes = startMinutes + serviceDuration
    
    // Verificar se todos os slots de 5min necessários estão livres
    const slots = generateTimeSlots()
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 5) {
      const hours = Math.floor(currentMinutes / 60)
      const minutes = currentMinutes % 60
      const slotTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      
      if (slots.includes(slotTime) && isTimeSlotOccupied(slotTime, professionalId, excludeAppointmentId)) {
        return false
      }
    }
    
    return true
  }

  // 🇧🇷 OTIMIZADO: Calcular estatísticas do dia usando useMemo
  const dayStats = useMemo(() => {
    // 🔍 Filtrar agendamentos do dia atual por profissional selecionado
    let filteredTodayAppointments = todayAppointments
    
    // Se um profissional específico está selecionado, filtrar por ele
    if (selectedProfessional !== "todos") {
      filteredTodayAppointments = todayAppointments.filter(apt => 
        apt.professionalId === selectedProfessional
      )
    }
    
    // ⚠️ Excluir agendamentos cancelados dos cálculos conforme solicitado
    const activeAppointments = filteredTodayAppointments.filter(apt => 
      apt.status !== 'CANCELLED' && apt.status !== 'cancelled'
    )
    
    const completed = activeAppointments.filter(apt => 
      apt.status === 'completed' || apt.status === 'COMPLETED'
    )
    const pending = activeAppointments.filter(apt => 
      apt.status === 'pending' || apt.status === 'CONFIRMED' || apt.status === 'IN_PROGRESS'
    )
    
    // 💰 Receita apenas de agendamentos concluídos
    const totalRevenue = completed.reduce((sum, apt) => sum + (Number(apt.totalPrice) || 0), 0)
    
    // 📊 Calcular taxa de ocupação baseada em minutos ocupados vs disponíveis
    const totalSlotsInDay = generateTimeSlots().length
    const totalOccupiedSlots = activeAppointments.reduce((sum, apt) => {
      const serviceDuration = apt.duration || 30
      const slotsNeeded = Math.ceil(serviceDuration / 5) // slots de 5 minutos
      return sum + slotsNeeded
    }, 0)
    
    const occupancyRate = totalSlotsInDay > 0 ? Math.round((totalOccupiedSlots / totalSlotsInDay) * 100) : 0

    return {
      appointmentsToday: activeAppointments.length,
      completed: completed.length,
      pending: pending.length,
      occupancyRate: Math.min(occupancyRate, 100),
      revenueToday: totalRevenue
    }
  }, [todayAppointments, selectedProfessional, generateTimeSlots]) // Dependências para recalcular estatísticas



  // Resetar formulário
  const resetForm = () => {
    setNewAppointment({
      endUserId: "",
      professionalId: "",
      serviceId: "",
      date: "",
      time: "",
      notes: ""
    })
    setEditingAppointment(null)
    setBackendError(null)
    setClientSearchTerm("")
    setIsClientDropdownOpen(false)
  }

  // Validação de dados com verificação de conflitos em tempo real
  const validateForm = async () => {
    setIsValidating(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Iniciando validação do formulário:', newAppointment)
        
        // ✅ DEBUG: Verificar se os valores realmente existem
        console.log('🔍 Validação detalhada:', {
          endUserId: { value: newAppointment.endUserId, type: typeof newAppointment.endUserId, empty: !newAppointment.endUserId },
          serviceId: { value: newAppointment.serviceId, type: typeof newAppointment.serviceId, empty: !newAppointment.serviceId },
          date: { value: newAppointment.date, type: typeof newAppointment.date, empty: !newAppointment.date },
          time: { value: newAppointment.time, type: typeof newAppointment.time, empty: !newAppointment.time },
          professionalId: { value: newAppointment.professionalId, type: typeof newAppointment.professionalId },
          notes: { value: newAppointment.notes, type: typeof newAppointment.notes }
        })
      }
      
      if (!newAppointment.endUserId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Cliente não selecionado')
        }
        toast({
          title: "❌ Cliente Obrigatório",
          description: "Selecione um cliente para continuar",
          variant: "destructive",
        })
        return false
      }
      
      if (!newAppointment.serviceId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Serviço não selecionado')
        }
        toast({
          title: "❌ Serviço Obrigatório", 
          description: "Selecione um serviço para continuar",
          variant: "destructive",
        })
        return false
      }

      if (!newAppointment.date) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Data não selecionada')
        }
        toast({
          title: "❌ Data Obrigatória",
          description: "Selecione uma data para o agendamento",
          variant: "destructive",
        })
        return false
      }

      if (!newAppointment.time) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Horário não selecionado')
        }
        toast({
          title: "❌ Horário Obrigatório",
          description: "Selecione um horário para o agendamento",
          variant: "destructive",
        })
        return false
      }

      // Criar date usando valores locais para evitar problemas de fuso horário
      const [year, month, day] = newAppointment.date.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 validateForm Debug:', {
          inputDate: newAppointment.date,
          selectedDate: selectedDate.toString(),
          dayOfWeek: selectedDate.getDay()
        })
      }
      
      // ✅ PERMITIR agendamentos retroativos no dashboard - validação de data passada removida
      // Comentado para permitir retroagendamento conforme solicitado
      // const today = new Date()
      // today.setHours(0, 0, 0, 0)
      // selectedDate.setHours(0, 0, 0, 0)
      // 
      // if (selectedDate < today) {
      //   toast({
      //     title: "🚫 Data Inválida",
      //     description: "Não é possível agendar em datas passadas",
      //     variant: "destructive",
      //   })
      //   return false
      // }

      // Validar se estabelecimento está aberto no dia selecionado
      if (!isEstablishmentOpen(selectedDate)) {
        const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })
        toast({
          title: "🏪 Estabelecimento Fechado",
          description: `O estabelecimento não funciona ${dayName}. Escolha outro dia.`,
          variant: "destructive",
        })
        return false
      }

      // Validar se horário está dentro do funcionamento
      if (!isTimeWithinWorkingHours(selectedDate, newAppointment.time)) {
        const dayConfig = getWorkingHoursForDay(selectedDate)
        toast({
          title: "⏰ Fora do Horário de Funcionamento",
          description: `Horário de funcionamento: ${dayConfig.startTime} às ${dayConfig.endTime}`,
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return false
      }

      // ✅ PERMITIR agendamentos retroativos no dashboard - comentado para permitir retroagendamento
      // Validar se é hoje e o horário já passou
      // const now = new Date()
      // const isToday = selectedDate.getTime() === today.getTime()
      
      // if (isToday) {
      //   const [hours, minutes] = newAppointment.time.split(':').map(Number)
      //   const appointmentTime = new Date()
      //   appointmentTime.setHours(hours, minutes, 0, 0)
      //   
      //   if (appointmentTime <= now) {
      //     toast({
      //       title: "⏰ Horário Já Passou",
      //       description: "Selecione um horário futuro para hoje",
      //       variant: "destructive",
      //     })
      //     setNewAppointment(prev => ({...prev, time: ""}))
      //     return false
      //   }
      // }

      // Verificar conflitos com dados atuais (sem recarregar)
      const appointmentData = {
        date: newAppointment.date,
        time: newAppointment.time,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined
      }
      
      if (hasConflict(appointmentData)) {
        toast({
          title: "⚠️ Conflito de Horário",
          description: "Este horário já está ocupado. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return false
      }

      // Verificar se o horário ainda está disponível (dupla verificação)
      const selectedService = services.find(s => s.id === newAppointment.serviceId)
      if (selectedService) {
        const availableSlots = await getAvailableTimeSlots()
        if (!availableSlots.includes(newAppointment.time)) {
          toast({
            title: "🚫 Horário Indisponível",
            description: "Este horário não está mais disponível. Selecione outro horário.",
            variant: "destructive",
          })
          setNewAppointment(prev => ({...prev, time: ""}))
          return false
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Validação concluída com sucesso')
      }
      
      // ✅ Aviso informativo para agendamentos retroativos (não bloqueante)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏰ Agendamento retroativo detectado - prosseguindo com aviso')
        }
      } else if (selectedDate.getTime() === today.getTime()) {
        // Se é hoje, verificar se o horário já passou
        const [hours, minutes] = newAppointment.time.split(':').map(Number)
        const appointmentTime = new Date()
        appointmentTime.setHours(hours, minutes, 0, 0)
        const now = new Date()
        
        if (appointmentTime <= now) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⏰ Agendamento em horário passado (hoje) detectado - prosseguindo com aviso')
          }
        }
      }
      
      return true
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 Erro na validação:', error)
      }
      toast({
        title: "❌ Erro de Validação",
        description: "Erro interno ao validar agendamento. Tente novamente.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsValidating(false)
    }
  }

  // Criar agendamento com validação robusta
  const handleCreateAppointment = async () => {
    // Limpar erro anterior
    setBackendError(null)
    
    // 🔍 DEBUG: Log do estado atual do formulário antes da validação
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Estado do formulário ANTES da validação:', {
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId, 
        professionalId: newAppointment.professionalId,
        date: newAppointment.date,
        time: newAppointment.time,
        notes: newAppointment.notes,
        isComplete: !!(newAppointment.endUserId && newAppointment.serviceId && newAppointment.date && newAppointment.time)
      })
    }
    
    if (!(await validateForm())) return

    setIsCreating(true)
    try {
      // Validação final antes de criar
      const appointmentData = {
        date: newAppointment.date,
        time: newAppointment.time,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined
      }
      
      if (hasConflict(appointmentData)) {
        toast({
          title: "⚠️ Conflito Detectado",
          description: "Este horário foi ocupado por outro agendamento. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return
      }

      // 🇧🇷 CORREÇÃO: Criar dateTime usando timezone brasileiro (agora direto)
      const appointmentDateTime = parseDateTime(newAppointment.date, newAppointment.time)
      debugTimezone(appointmentDateTime, 'Frontend - Criando agendamento')

      if (process.env.NODE_ENV === 'development') {
        console.log('🚨 CORREÇÃO UTC - Debug da data:', {
          inputDate: newAppointment.date,
          inputTime: newAppointment.time,
          localDateTime: appointmentDateTime.toString(),
          localISOString: toLocalISOString(appointmentDateTime) // ✅ Local
        })
      }

      const finalAppointmentData = {
        endUserId: newAppointment.endUserId,
        services: [newAppointment.serviceId], // ✅ CORREÇÃO: Enviar como array conforme backend espera
        professionalId: newAppointment.professionalId || undefined,
        dateTime: toLocalISOString(appointmentDateTime), // 🚨 CORREÇÃO: SEM conversão UTC
        notes: newAppointment.notes || undefined
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Criando agendamento:', finalAppointmentData)
        console.log('🔍 Debug do formulário:', {
          endUserId: newAppointment.endUserId,
          serviceId: newAppointment.serviceId,
          professionalId: newAppointment.professionalId,
          date: newAppointment.date,
          time: newAppointment.time,
          notes: newAppointment.notes
        })
      }
      
      // ✅ Validação final antes de enviar
      if (!finalAppointmentData.endUserId || !finalAppointmentData.services || finalAppointmentData.services.length === 0 || !finalAppointmentData.dateTime) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Dados inválidos para envio:', finalAppointmentData)
        }
        toast({
          title: "❌ Erro de Validação",
          description: "Campos obrigatórios não preenchidos. Verifique o formulário.",
          variant: "destructive",
        })
        return
      }
      
      await createAppointment(finalAppointmentData)
      
      toast({
        title: "✅ Sucesso",
        description: "Agendamento criado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      resetForm()
      await fetchAppointments() // Recarregar dados
      setLastUpdated(new Date()) // Atualizar timestamp
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 Erro ao criar agendamento:', error)
      }
      
      // Tratar diferentes tipos de erro do backend com mensagens específicas
      let errorMessage = "Erro ao criar agendamento. Tente novamente."
      
      if (error?.message) {
        if (error.message.includes('fechado')) {
          errorMessage = error.message
        } else if (error.message.includes('fora do funcionamento')) {
          errorMessage = error.message
        } else if (error.message.includes('conflito')) {
          errorMessage = error.message
        } else if (error.message.includes('passado')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message
        }
      }
      
      // Capturar erros HTTP do backend (principal correção)
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.status === 400 && error?.data?.message) {
        errorMessage = error.data.message
      }
      
      // Exibir erro no modal em vez de apenas toast
      setBackendError(errorMessage)
      
      // Também manter o toast para feedback geral
      toast({
        title: "❌ Erro ao Criar Agendamento",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Editar agendamento (função simples)
  const handleEditAppointment = (appointment: any) => {
    // Parse seguro do dateTime do banco (sem conversão UTC automática)
    const appointmentDate = parseDatabaseDateTime(appointment.dateTime)
    
    const formattedDate = toLocalDateString(appointmentDate)
    const formattedTime = extractTimeFromDateTime(appointment.dateTime)
    
    debugTimezone(appointmentDate, `Editando agendamento`)
    if (process.env.NODE_ENV === 'development') {
      console.log('🇧🇷 Dados para edição:', {
        appointmentDate: toLocalISOString(appointmentDate),
        formattedDate,
        formattedTime
      })
    }
    
    setNewAppointment({
      endUserId: appointment.endUserId || appointment.endUser?.id || "",
      professionalId: appointment.professionalId || "",
      serviceId: appointment.services?.[0]?.id || "", // pegar primeiro serviço por compatibilidade
      date: formattedDate,
      time: formattedTime,
      notes: appointment.notes || ""
    })
    
    setEditingAppointment(appointment)
    setIsNewAppointmentOpen(true) // Reutilizar o modal existente
  }

  // Atualizar agendamento existente com validação
  const handleUpdateAppointment = async () => {
    // Limpar erro anterior
    setBackendError(null)
    
    if (!(await validateForm()) || !editingAppointment) return

    setIsCreating(true)
    try {
      // Validação final antes de atualizar
      const appointmentData = {
        date: newAppointment.date,
        time: newAppointment.time,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined
      }
      
      if (hasConflict(appointmentData)) {
        toast({
          title: "⚠️ Conflito Detectado",
          description: "Este horário foi ocupado por outro agendamento. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return
      }

      // 🇧🇷 CORREÇÃO: Criar dateTime usando timezone brasileiro (agora direto)
      const appointmentDateTime = parseDateTime(newAppointment.date, newAppointment.time)
      debugTimezone(appointmentDateTime, 'Frontend - Atualizando agendamento')

      if (process.env.NODE_ENV === 'development') {
        console.log('🚨 CORREÇÃO UTC - Debug da data (UPDATE):', {
          inputDate: newAppointment.date,
          inputTime: newAppointment.time,
          localDateTime: appointmentDateTime.toString(),
          localISOString: toLocalISOString(appointmentDateTime) // ✅ Local
        })
      }

      const finalAppointmentData = {
        id: editingAppointment.id,
        endUserId: newAppointment.endUserId,
        services: [newAppointment.serviceId], // ✅ CORREÇÃO: Enviar como array conforme backend espera
        professionalId: newAppointment.professionalId || undefined,
        dateTime: toLocalISOString(appointmentDateTime), // 🚨 CORREÇÃO: SEM conversão UTC
        notes: newAppointment.notes || undefined
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Atualizando agendamento:', finalAppointmentData)
        console.log('🔍 Debug do formulário (update):', {
          endUserId: newAppointment.endUserId,
          serviceId: newAppointment.serviceId,
          professionalId: newAppointment.professionalId,
          date: newAppointment.date,
          time: newAppointment.time,
          notes: newAppointment.notes
        })
      }
      await updateAppointment(finalAppointmentData)
      
      toast({
        title: "✅ Sucesso",
        description: "Agendamento atualizado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      setEditingAppointment(null)
      resetForm()
      await fetchAppointments() // Recarregar dados
      setLastUpdated(new Date()) // Atualizar timestamp
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 Erro ao atualizar agendamento:', error)
      }
      
      // Tratar diferentes tipos de erro do backend com mensagens específicas
      let errorMessage = "Erro ao atualizar agendamento. Tente novamente."
      
      if (error?.message) {
        if (error.message.includes('fechado')) {
          errorMessage = error.message
        } else if (error.message.includes('fora do funcionamento')) {
          errorMessage = error.message
        } else if (error.message.includes('conflito')) {
          errorMessage = error.message
        } else if (error.message.includes('passado')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message
        }
      }
      
      // Capturar erros HTTP do backend
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.status === 400 && error?.data?.message) {
        errorMessage = error.data.message
      }
      
      // Exibir erro no modal em vez de apenas toast
      setBackendError(errorMessage)
      
      toast({
        title: "❌ Erro ao Atualizar Agendamento",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }
  const handleCompleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return

    // Preparar dados do agendamento para o modal
    const appointmentData = {
      id: appointmentId,
      client: appointment.endUser?.name || 'Cliente',
      service: appointment.services?.map((s: any) => s.name).join(' + ') || 'Serviço',
      totalPrice: Number(appointment.totalPrice) || 0,
      time: extractTimeFromDateTime(appointment.dateTime)
    }

    setAppointmentToComplete(appointmentData)
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
      
      // Recarregar dados da agenda
      const currentDateString = toLocalDateString(currentDate)
      const professionalParam = selectedProfessional === "todos" ? undefined : selectedProfessional
      const statusParam = selectedStatus === "todos" ? undefined : selectedStatus
      await fetchAppointments(currentDateString, statusParam, professionalParam)
      setLastUpdated(new Date()) // Atualizar timestamp
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

  // Abrir diálogo de confirmação para cancelar
  const handleCancelAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    const clientName = appointment?.endUser?.name || 'Cliente'
    const serviceName = appointment?.services?.map((s: any) => s.name).join(' + ') || 'Serviço'
    
    setConfirmDialog({
      isOpen: true,
      type: 'cancel',
      appointmentId,
      clientName,
      serviceName
    })
  }

  // Confirmar ação do diálogo
  const handleConfirmAction = async () => {
    if (!confirmDialog.appointmentId || !confirmDialog.type) return

    try {
      if (confirmDialog.type === 'delete') {
        // ✅ EXCLUSÃO: Deletar agendamento permanentemente
        await deleteAppointment(confirmDialog.appointmentId)
        
        toast({
          title: "Sucesso",
          description: "Agendamento excluído com sucesso!",
        })
      } else if (confirmDialog.type === 'cancel') {
        // ✅ CANCELAMENTO: Cancelar agendamento
        await updateAppointment({ id: confirmDialog.appointmentId, status: 'CANCELLED' })
        
        toast({
          title: "Sucesso",
          description: "Agendamento cancelado com sucesso!",
        })
      }
      // Nota: A conclusão agora é feita através do modal de pagamento
      
      // ✅ Recarregar dados com os mesmos filtros aplicados
      const currentDateString = toLocalDateString(currentDate)
      const professionalParam = selectedProfessional === "todos" ? undefined : selectedProfessional
      const statusParam = selectedStatus === "todos" ? undefined : selectedStatus
      await fetchAppointments(currentDateString, statusParam, professionalParam)
      setLastUpdated(new Date()) // Atualizar timestamp
    } catch (error) {
      const actionText = confirmDialog.type === 'delete' ? 'excluir' : 'cancelar'
      
      toast({
        title: "Erro",
        description: `Erro ao ${actionText} agendamento`,
        variant: "destructive",
      })
    } finally {
      setConfirmDialog({
        isOpen: false,
        type: null,
        appointmentId: '',
        clientName: '',
        serviceName: ''
      })
    }
  }

  // Deletar agendamento permanentemente
  const handleDeleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    const clientName = appointment?.endUser?.name || 'Cliente'
    const serviceName = appointment?.services?.map((s: any) => s.name).join(' + ') || 'Serviço'
    
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      appointmentId,
      clientName,
      serviceName
    })
  }

  // Formatar data para exibição
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Função para navegar entre datas
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1))
    setCurrentDate(newDate)
  }

  // 🇧🇷 NOVO: Filtrar agendamentos por data, profissional e status (sem conversões UTC)
  const filteredAppointments = appointments.filter(appointment => {
    // Parse seguro do dateTime do banco (sem conversão UTC automática)
    const appointmentDate = parseDatabaseDateTime(appointment.dateTime)
    const aptDateString = toLocalDateString(appointmentDate) // YYYY-MM-DD
    const currentDateString = toLocalDateString(currentDate) // YYYY-MM-DD
    
    const matchesDate = aptDateString === currentDateString
    const matchesProfessional = selectedProfessional === "todos" || 
                               appointment.professionalId === selectedProfessional
    
    // Normalizar status para comparação (maiúsculo)
    const appointmentStatus = (appointment.status || '').toString().toUpperCase()
    const filterStatus = selectedStatus.toUpperCase()
    const matchesStatus = selectedStatus === "todos" || appointmentStatus === filterStatus
    
    return matchesDate && matchesProfessional && matchesStatus
  })

  // Status do agendamento - melhorado
  const getStatusBadge = (status: string) => {
    const statusMap = {
      CONFIRMED: { label: "Confirmado", variant: "default" as const, color: "bg-[#10b981]" },
      IN_PROGRESS: { label: "Em andamento", variant: "default" as const, color: "bg-yellow-500" },
      COMPLETED: { label: "Concluído", variant: "secondary" as const, color: "bg-[#10b981]" },
      CANCELLED: { label: "Cancelado", variant: "destructive" as const, color: "bg-red-500" },
      NO_SHOW: { label: "Não compareceu", variant: "destructive" as const, color: "bg-red-500" },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const, color: "bg-gray-500" }
  }

  // Função para verificar se data/hora já passou
  const isPastDateTime = (dateTime: string | Date) => {
    const appointmentDateTime = typeof dateTime === 'string' ? parseDatabaseDateTime(dateTime) : dateTime
    const now = new Date()
    return appointmentDateTime < now
  }

  // Função para obter a próxima disponibilidade
  const getNextAvailableTime = (serviceDuration: number, professionalId?: string, excludeAppointmentId?: string) => {
    const slots = generateTimeSlots()
    for (const slot of slots) {
      if (canScheduleService(slot, serviceDuration, professionalId, excludeAppointmentId)) {
        return slot
      }
    }
    return null
  }

  // ✅ CORRIGIDA: Função para verificar se um horário é passado
  const isTimeInPast = (date: string, time: string): boolean => {
    try {
      // ✅ CORREÇÃO: Usar mesma lógica de criação de data do resto do código
      const [year, month, day] = date.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)
      
      // ✅ CORREÇÃO: Se é data futura, definitivamente não é passado
      if (selectedDate.getTime() > today.getTime()) {
        return false
      }
      
      // ✅ CORREÇÃO: Se é data passada, definitivamente é passado
      if (selectedDate.getTime() < today.getTime()) {
        return true
      }
      
      // ✅ Se é hoje, verificar o horário
      const [hours, minutes] = time.split(':').map(Number)
      const slotTime = new Date()
      slotTime.setHours(hours, minutes, 0, 0)
      const now = new Date()
      
      return slotTime < now
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao verificar se horário é passado:', error)
      }
      return false
    }
  }

  // 🚀 NOVA: Função de disponibilidade usando regras de profissional
  const getAvailableTimeSlotsWithProfessionalRules = async (
    excludeAppointmentId?: string
  ): Promise<{ slots: string[]; usedProfessionalRules: boolean; fallbackReason?: string }> => {
    try {
      // Validações básicas
      if (!newAppointment.serviceId || !newAppointment.date || !newAppointment.professionalId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 Professional rules: Dados insuficientes', {
            serviceId: !!newAppointment.serviceId,
            date: !!newAppointment.date,
            professionalId: !!newAppointment.professionalId
          })
        }
        return { slots: [], usedProfessionalRules: false, fallbackReason: 'Profissional, serviço ou data não selecionados' }
      }

      const selectedService = services.find(s => s.id === newAppointment.serviceId)
      if (!selectedService) {
        return { slots: [], usedProfessionalRules: false, fallbackReason: 'Serviço não encontrado' }
      }

      // Verificar se sistema está pronto
      if (!agendaAvailabilityReady) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 Professional rules: Sistema não inicializado')
        }
        return { slots: [], usedProfessionalRules: false, fallbackReason: 'Sistema de disponibilidade não inicializado' }
      }

      // Buscar slots usando regras do profissional
      const result = await getProfessionalAvailableSlots(
        newAppointment.professionalId,
        newAppointment.date,
        selectedService.duration || 30
      )

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Professional schedules result:', {
          professionalId: newAppointment.professionalId,
          date: newAppointment.date,
          serviceDuration: selectedService.duration,
          slotsFound: result.slots.length,
          usedProfessionalRules: result.usedProfessionalRules,
          fallbackReason: result.fallbackReason,
          firstSlots: result.slots.slice(0, 3),
          lastSlots: result.slots.slice(-3)
        })
      }

      return result
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro em getAvailableTimeSlotsWithProfessionalRules:', error)
      }
      
      return { 
        slots: [], 
        usedProfessionalRules: false, 
        fallbackReason: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  // 🔍 FUNÇÃO DE TESTE: Comparar lógica atual vs nova (apenas para desenvolvimento)
  const compareAvailabilityLogics = async (excludeAppointmentId?: string) => {
    if (process.env.NODE_ENV !== 'development' || !ENABLE_PROFESSIONAL_SCHEDULES) {
      return
    }

    try {
      // Nova lógica
      const newResult = await getAvailableTimeSlotsWithProfessionalRules(excludeAppointmentId)

      // Lógica atual - executar manualmente aqui para comparar
      let currentSlots: string[] = []
      if (newAppointment.serviceId && newAppointment.date) {
        const selectedService = services.find(s => s.id === newAppointment.serviceId)
        if (selectedService) {
          const [year, month, day] = newAppointment.date.split('-').map(Number)
          const selectedDate = new Date(year, month - 1, day)
          
          if (isEstablishmentOpen(selectedDate)) {
            const allSlots = generateTimeSlotsForDate(selectedDate)
            currentSlots = allSlots.filter((time: string) => {
              const testAppointment = {
                date: newAppointment.date,
                time: time,
                serviceId: newAppointment.serviceId,
                professionalId: newAppointment.professionalId || undefined
              }
              
              const hasConflictResult = hasConflict(testAppointment)
              const serviceDuration = selectedService.duration || 30
              const canSchedule = canScheduleService(time, serviceDuration, newAppointment.professionalId || undefined, excludeAppointmentId)
              
              return !hasConflictResult && canSchedule
            })
          }
        }
      }

      const professionalSlots = newResult.slots

      // Comparar resultados
      const slotsOnlyInCurrent = currentSlots.filter(slot => !professionalSlots.includes(slot))
      const slotsOnlyInProfessional = professionalSlots.filter(slot => !currentSlots.includes(slot))
      const commonSlots = currentSlots.filter(slot => professionalSlots.includes(slot))

      console.log('🔍 COMPARAÇÃO DE LÓGICAS:', {
        profissional: newAppointment.professionalId,
        data: newAppointment.date,
        servico: services.find(s => s.id === newAppointment.serviceId)?.name,
        duracao: services.find(s => s.id === newAppointment.serviceId)?.duration,
        resultados: {
          logicaAtual: {
            total: currentSlots.length,
            slots: currentSlots.slice(0, 5)
          },
          logicaProfissional: {
            total: professionalSlots.length,
            slots: professionalSlots.slice(0, 5),
            usou: newResult.usedProfessionalRules
          },
          diferenças: {
            comuns: commonSlots.length,
            apenasAtual: slotsOnlyInCurrent.length > 0 ? slotsOnlyInCurrent : 'nenhum',
            apenasProfissional: slotsOnlyInProfessional.length > 0 ? slotsOnlyInProfessional : 'nenhum'
          }
        }
      })

      if (slotsOnlyInCurrent.length > 0 || slotsOnlyInProfessional.length > 0) {
        console.warn('⚠️ DIFERENÇAS DETECTADAS entre lógicas de disponibilidade!')
      }

    } catch (error) {
      console.error('❌ Erro na comparação de lógicas:', error)
    }
  }

  // Função melhorada para obter horários disponíveis para o modal
  const getAvailableTimeSlots = async (excludeAppointmentId?: string): Promise<string[]> => {
    try {
      // � MONITORAMENTO: Comparar lógicas em desenvolvimento
      if (process.env.NODE_ENV === 'development' && ENABLE_PROFESSIONAL_SCHEDULES && newAppointment.professionalId) {
        // Executar comparação em background (não bloquear)
        compareAvailabilityLogics(excludeAppointmentId).catch(err => 
          console.warn('Erro na comparação de lógicas:', err)
        )
      }

      // �🚀 NOVA LÓGICA: Tentar usar regras de profissional primeiro
      if (ENABLE_PROFESSIONAL_SCHEDULES && newAppointment.professionalId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Tentando usar regras de profissional...')
        }

        const professionalResult = await getAvailableTimeSlotsWithProfessionalRules(excludeAppointmentId)
        
        if (professionalResult.usedProfessionalRules) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Usando regras de profissional:', {
              slots: professionalResult.slots.length,
              firstSlots: professionalResult.slots.slice(0, 3)
            })
          }
          return professionalResult.slots
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Fallback para lógica atual. Motivo:', professionalResult.fallbackReason)
          }
        }
      }

      // 🔄 LÓGICA ATUAL: Fallback seguro (mantida inalterada)
      if (!newAppointment.serviceId || !newAppointment.date) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 getAvailableTimeSlots: Serviço ou data não selecionados')
        }
        return []
      }
      
      const selectedService = services.find(s => s.id === newAppointment.serviceId)
      if (!selectedService) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 getAvailableTimeSlots: Serviço não encontrado')
        }
        return []
      }
      
      // Criar date usando valores locais para evitar problemas de fuso horário
      const [year, month, day] = newAppointment.date.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 getAvailableTimeSlots Debug:', {
          inputDate: newAppointment.date,
          selectedDate: selectedDate.toString(),
          dayOfWeek: selectedDate.getDay()
        })
      }
      
      // Verificar se o estabelecimento está aberto no dia
      if (!isEstablishmentOpen(selectedDate)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 getAvailableTimeSlots: Estabelecimento fechado')
        }
        return []
      }
      
      // ✅ PERMITIR datas passadas para retroagendamento no dashboard
      // Não bloquear mais datas passadas - permitir retroagendamento
      
      // Gerar slots para a data específica
      const allSlots = generateTimeSlotsForDate(selectedDate)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 getAvailableTimeSlots: ${allSlots.length} slots gerados para ${selectedDate.toDateString()}`)
      }
      
      // ✅ MODIFICAÇÃO: Permitir horários passados com indicador visual
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)
      
      // Se é hoje, marcar quais horários já passaram (mas ainda incluí-los)
      const now = new Date()
      const isToday = selectedDate.getTime() === today.getTime()
      
      // ✅ NÃO filtrar horários passados - incluir todos para retroagendamento
      const allAvailableSlots = allSlots
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 getAvailableTimeSlots: ${allAvailableSlots.length} slots incluindo passados`)
      }
      
      // Filtrar slots que não têm conflito
      const availableSlots = allAvailableSlots.filter((time: string) => {
        const testAppointment = {
          date: newAppointment.date,
          time: time,
          serviceId: newAppointment.serviceId,
          professionalId: newAppointment.professionalId || undefined
        }
        
        const hasConflictResult = hasConflict(testAppointment)
        
        // Verificar se há tempo suficiente para o serviço
        const serviceDuration = selectedService.duration || 30
        const canSchedule = canScheduleService(time, serviceDuration, newAppointment.professionalId || undefined, excludeAppointmentId)
        
        return !hasConflictResult && canSchedule
      })
      
      // 🔧 CORREÇÃO: Garantir que o horário atual do agendamento sendo editado esteja sempre na lista
      if (excludeAppointmentId && editingAppointment && newAppointment.time) {
        const currentTime = newAppointment.time
        // Se o horário atual não está na lista de disponíveis, adicioná-lo
        if (!availableSlots.includes(currentTime)) {
          // Verificar se o horário está dentro dos slots válidos do dia
          if (allAvailableSlots.includes(currentTime)) {
            availableSlots.push(currentTime)
            // Ordenar os horários
            availableSlots.sort()
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Horário atual do agendamento (${currentTime}) adicionado à lista de disponíveis`)
            }
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ getAvailableTimeSlots: ${availableSlots.length} slots disponíveis finais`)
      }
      
      return availableSlots
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 Erro ao obter horários disponíveis:', error)
      }
      return []
    }
  }

  // Função para verificar se uma data selecionada está fechada e exibir informações adequadas
  const getDateStatus = (checkDate?: string) => {
    const dateToCheck = checkDate || newAppointment.date
    
    if (!dateToCheck) {
      return { isOpen: null, message: null, dayConfig: null }
    }
    
    // Criar date usando valores locais para evitar problemas de fuso horário
    const [year, month, day] = dateToCheck.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
    
    const isOpen = isEstablishmentOpen(selectedDate)
    const dayConfig = getWorkingHoursForDay(selectedDate)
    
    // 🇧🇷 CORREÇÃO: Usar função brasileira para obter nome do dia - MESMA usada no hook
    const dayNameBR = getBrazilDayNameEn(selectedDate)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 getDateStatus Debug DETALHADO:', {
        dateToCheck,
        selectedDate: selectedDate.toString(),
        dayOfWeek: selectedDate.getDay(),
        dayNameBR,
        dayNameLocal: selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
        dayConfig,
        isOpen,
        workingHoursAvailable: workingHours?.length || 0,
        allWorkingHours: workingHours?.map(wh => ({
          dayOfWeek: wh.dayOfWeek,
          isActive: wh.isActive,
          startTime: wh.startTime,
          endTime: wh.endTime
        })) || [],
        establishmentOpenResult: isEstablishmentOpen(selectedDate),
        debugDate: `Sexta-feira: ${selectedDate.getDay() === 5 ? 'SIM' : 'NÃO'}`
      })
    }
    
    if (!isOpen) {
      const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })
      return {
        isOpen: false,
        message: `Estabelecimento fechado ${dayName}`,
        dayConfig: null
      }
    }
    
    return {
      isOpen: true,
      message: `Funcionamento: ${dayConfig.startTime} às ${dayConfig.endTime}`,
      dayConfig
    }
  }

  if (appointmentsLoading || clientsLoading || servicesLoading || establishmentLoading || workingHoursLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-2 text-[#71717a]">Carregando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 🔍 COMPONENTE DE STATUS DO SISTEMA (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && ENABLE_PROFESSIONAL_SCHEDULES && (
        <ProfessionalScheduleStatus
          professionalId={selectedProfessional !== "todos" ? selectedProfessional : undefined}
          businessSlug={businessSlug}
          isReady={agendaAvailabilityReady}
          isLoading={agendaAvailabilityLoading}
          error={agendaAvailabilityError}
          enabledFeatures={{
            professionalSchedules: ENABLE_PROFESSIONAL_SCHEDULES,
            debugging: process.env.NODE_ENV === 'development',
            metrics: false
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Agenda</h1>
          <p className="text-sm md:text-base text-[#a1a1aa]">Gerencie seus agendamentos</p>
          {lastUpdated && (
            <p className="text-xs text-[#71717a] mt-1">
              Última atualização: {lastUpdated.toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Versão Mobile - Novo Agendamento primeiro */}
          <Button 
            onClick={() => setIsNewAppointmentOpen(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-xs md:text-sm md:hidden"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
            Novo Agendamento
          </Button>
          
          <Button 
            onClick={handleRefreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="border-[#27272a] hover:bg-[#27272a] text-xs md:text-sm"
          >
            <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          
          {/* Versão Desktop - ordem original (Atualizar primeiro) */}
          <Button 
            onClick={() => setIsNewAppointmentOpen(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-xs md:text-sm hidden md:flex"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1.5" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10b981]/20 rounded-lg">
                <Calendar className="w-5 h-5 text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm md:text-sm text-[#a1a1aa]">
                  Agendamentos Hoje
                  {selectedProfessional !== "todos" && (
                    <span className="ml-1 text-xs text-[#10b981]">
                      • {professionalsData?.find(p => p.id === selectedProfessional)?.name || 'Profissional'}
                    </span>
                  )}
                </p>
                <p className="text-xl md:text-2xl font-bold text-[#ededed]">{dayStats.appointmentsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm md:text-sm text-[#a1a1aa]">
                  Concluídos
                  {selectedProfessional !== "todos" && (
                    <span className="ml-1 text-xs text-[#10b981]">
                      • {professionalsData?.find(p => p.id === selectedProfessional)?.name || 'Profissional'}
                    </span>
                  )}
                </p>
                <p className="text-xl md:text-2xl font-bold text-[#ededed]">{dayStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm md:text-sm text-[#a1a1aa]">
                  Pendentes
                  {selectedProfessional !== "todos" && (
                    <span className="ml-1 text-xs text-[#10b981]">
                      • {professionalsData?.find(p => p.id === selectedProfessional)?.name || 'Profissional'}
                    </span>
                  )}
                </p>
                <p className="text-xl md:text-2xl font-bold text-[#ededed]">{dayStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm md:text-sm text-[#a1a1aa]">
                  Taxa de Ocupação
                  {selectedProfessional !== "todos" && (
                    <span className="ml-1 text-xs text-[#10b981]">
                      • {professionalsData?.find(p => p.id === selectedProfessional)?.name || 'Profissional'}
                    </span>
                  )}
                </p>
                <p className="text-xl md:text-2xl font-bold text-[#ededed]">{dayStats.occupancyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10b981]/20 rounded-lg">
                <span className="text-[#10b981] font-bold text-lg">R$</span>
              </div>
              <div>
                <p className="text-sm md:text-sm text-[#a1a1aa]">
                  Receita Hoje
                  {selectedProfessional !== "todos" && (
                    <span className="ml-1 text-xs text-[#10b981]">
                      • {professionalsData?.find(p => p.id === selectedProfessional)?.name || 'Profissional'}
                    </span>
                  )}
                </p>
                <p className="text-xl md:text-2xl font-bold text-[#ededed]">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(dayStats.revenueToday)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de navegação */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        {/* Navegação de data - sempre no topo em mobile */}
        <div className="flex items-center justify-center gap-4 md:justify-start">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("prev")}
            className="border-[#27272a] hover:bg-[#27272a] h-10 w-10 md:h-12 md:w-12"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-base md:text-lg xl:text-xl font-semibold text-[#ededed] whitespace-nowrap">
              {formatDate(currentDate)}
            </h2>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("next")}
            className="border-[#27272a] hover:bg-[#27272a] h-10 w-10 md:h-12 md:w-12"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Filtros - stack em mobile, inline em desktop */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-full md:w-48 bg-[#18181b] border-[#27272a] text-[#ededed] h-10 text-sm">
              <SelectValue placeholder="Filtrar por profissional" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a]">
              <SelectItem value="todos">Todos os profissionais</SelectItem>
              {professionalsData?.map((professional) => (
              <SelectItem key={professional.id} value={professional.id}>
                {professional.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full md:w-48 bg-[#18181b] border-[#27272a] text-[#ededed] h-10 text-sm">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-[#27272a]">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
            <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
            <SelectItem value="NO_SHOW">Não compareceu</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Agenda de Horários */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#ededed] text-base md:text-lg">Grade de Horários</CardTitle>
          <CardDescription className="text-[#a1a1aa] text-sm md:text-sm">
            {(() => {
              const dayConfig = getWorkingHoursForDay(currentDate)
              if (!dayConfig.isOpen) {
                const dayName = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })
                return `Estabelecimento fechado ${dayName}`
              }
              return `Grade de 5 em 5 minutos - Funcionamento: ${dayConfig.startTime} às ${dayConfig.endTime}`
            })()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 md:max-h-96 overflow-y-auto">
            {generateTimeSlots().map((time) => {
              const isOccupied = isTimeSlotOccupied(time, selectedProfessional === "todos" ? undefined : selectedProfessional)
              // ✅ CORREÇÃO: Buscar TODOS os agendamentos do horário, não apenas o primeiro
              const appointmentsAtTime = filteredAppointments.filter(apt => {
                // Parse seguro do dateTime do banco (sem conversão UTC automática)
                const aptTime = extractTimeFromDateTime(apt.dateTime) // HH:mm sem UTC
                return aptTime === time
              })

              return (
                <div
                  key={time}
                  className={`flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 md:p-4 border-b border-[#27272a] hover:bg-[#27272a]/50 transition-colors 
                    ${appointmentsAtTime.length > 0 ? 'bg-blue-500/10' : 
                      isOccupied ? 'bg-red-500/10' : 'bg-[#10b981]/5'} 
                    ${appointmentsAtTime.length > 1 ? 'min-h-[120px]' : ''}
                    mb-3 sm:mb-0 mx-2 sm:mx-0 rounded-lg sm:rounded-none border-l-4 sm:border-l-0 border-l-[#10b981]/30 sm:border-l-transparent`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 flex-1">
                    {/* Hora com destaque mobile - ícone de relógio e separação visual */}
                    <div className="flex sm:block items-center justify-center sm:justify-start gap-2 sm:gap-0 w-full sm:w-16 sm:mt-1">
                      {/* Ícone de relógio apenas em mobile */}
                      <Clock className="w-4 h-4 text-[#10b981] sm:hidden" />
                      <div className="text-[#ededed] font-medium text-center sm:text-left text-base sm:text-sm md:text-lg">
                        {time}
                      </div>
                    </div>
                    
                    {/* Separação visual sutil apenas em mobile */}
                    <div className="w-full h-px bg-gradient-to-r from-[#27272a] via-[#10b981]/20 to-[#27272a] sm:hidden"></div>
                    {appointmentsAtTime.length > 0 ? (
                      <div className="flex-1 space-y-2">
                        {appointmentsAtTime.map((appointment, index) => (
                          <div key={appointment.id} className={`flex items-start gap-2 sm:gap-3 ${index > 0 ? 'pt-2 border-t border-[#27272a]' : ''}`}>
                            <div 
                              className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${getStatusBadge(appointment.status).color}`}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#ededed] font-medium text-sm md:text-base truncate">
                                {appointment.endUser?.name || appointment.clientName || 'Cliente'}
                              </p>
                              <p className="text-[#a1a1aa] text-xs md:text-sm break-words">
                                {appointment.services?.map((s: any) => s.name).join(' + ') || appointment.serviceName || 'Serviço'} 
                                <span className="text-[#10b981]"> • {appointment.duration || 30}min</span>
                                {/* ✅ SEMPRE exibir profissional quando houver professionalId */}
                                {appointment.professionalId && (
                                  <span className="block sm:inline">
                                    {` • ${
                                      appointment.professional?.name || 
                                      appointment.professionalName || 
                                      professionalsData?.find(p => p.id === appointment.professionalId)?.name ||
                                      `Prof. ${appointment.professionalId.substring(0, 8)}`
                                    }`}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-[#71717a]">
                                Status: {getStatusBadge(appointment.status).label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : isOccupied ? (
                      <div className="flex items-center gap-2 sm:gap-3 flex-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                        <p className="text-red-400 text-xs md:text-base">Ocupado (dentro de outro agendamento)</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 sm:gap-3 flex-1">
                        <div className="w-3 h-3 bg-[#10b981] rounded-full flex-shrink-0"></div>
                        <p className="text-[#10b981] text-xs md:text-base">Disponível - Clique para agendar</p>
                      </div>
                    )}
                  </div>
                  
                  {appointmentsAtTime.length === 0 && !isOccupied && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-white w-full sm:w-auto text-xs md:text-sm md:px-4 md:py-2"
                        onClick={() => {
                          setNewAppointment(prev => ({...prev, time, date: toLocalDateString(currentDate)}))
                          setIsNewAppointmentOpen(true)
                        }}
                      >
                        <Plus className="w-3 h-3 md:w-5 md:h-5 mr-1" />
                        Agendar
                      </Button>
                      
                      {/* Mostrar sugestão de próximo horário disponível se houver serviço selecionado */}
                      {newAppointment.serviceId && (
                        (() => {
                          const selectedService = services.find(s => s.id === newAppointment.serviceId)
                          if (selectedService) {
                            const nextAvailable = getNextAvailableTime(
                              selectedService.duration || 30,
                              newAppointment.professionalId || undefined
                            )
                            if (nextAvailable && nextAvailable !== time) {
                              return (
                                <span className="text-xs text-[#a1a1aa] text-center sm:text-left">
                                  Próximo: {nextAvailable}
                                </span>
                              )
                            }
                          }
                          return null
                        })()
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de agendamentos */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
              <p className="text-[#a1a1aa]">Nenhum agendamento para este dia</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => {
            const status = getStatusBadge(appointment.status)
            // Parse seguro do dateTime do banco (sem conversão UTC automática)
            const appointmentTime = extractTimeFromDateTime(appointment.dateTime) // HH:mm sem UTC

            return (
              <Card key={appointment.id} className="bg-[#18181b] border-[#27272a]">
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#10b981]" />
                          <span className="font-semibold text-[#ededed] text-lg md:text-base">{appointmentTime}</span>
                        </div>
                        <Badge variant={status.variant} className="w-fit text-xs">{status.label}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[#ededed] text-sm md:text-base">
                          <strong className="text-[#a1a1aa]">Cliente:</strong> {appointment.endUser?.name}
                        </p>
                        <p className="text-[#a1a1aa] text-sm md:text-base">
                          <strong>Serviço:</strong> {appointment.services?.map((s: any) => s.name).join(' + ') || 'Serviço'}
                        </p>
                        {/* ✅ SEMPRE exibir profissional - versão simplificada para debug */}
                        <p className="text-[#a1a1aa] text-sm md:text-base">
                          <strong>Profissional:</strong> {
                            appointment.professionalId ? (
                              appointment.professional?.name || 
                              appointment.professionalName || 
                              professionalsData?.find(p => p.id === appointment.professionalId)?.name ||
                              `Profissional (ID: ${appointment.professionalId})`
                            ) : (
                              <span className="text-red-400">Não informado</span>
                            )
                          }
                        </p>
                        {appointment.notes && (
                          <p className="text-[#a1a1aa] text-sm md:text-base">
                            <strong>Observações:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Seção de preço e duração - móvel: abaixo do conteúdo, desktop: lado direito */}
                    <div className="flex flex-row md:flex-col justify-between md:items-end gap-3">
                      <div className="flex flex-col md:text-right">
                        <p className="text-[#10b981] font-semibold text-lg md:text-base">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(appointment.totalPrice || 0)}
                        </p>
                        <p className="text-[#a1a1aa] text-sm">
                          {appointment.duration || 0} min
                        </p>
                      </div>

                      {/* Botões de ação - móvel: em linha, desktop: em linha também */}
                      <div className="flex gap-1 md:gap-2 flex-wrap">
                        {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                              className="border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-white p-2 md:px-3"
                              title="Concluir agendamento"
                            >
                              <Check className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white p-2 md:px-3"
                              title="Cancelar agendamento"
                            >
                              <X className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAppointment(appointment)}
                          className="border-[#27272a] hover:bg-[#27272a] p-2 md:px-3"
                          title="Editar agendamento"
                        >
                          <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white p-2 md:px-3"
                          title="Excluir agendamento"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de novo agendamento */}
      {isNewAppointmentOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsClientDropdownOpen(false)
            }
          }}
        >
          <Card className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
            {/* Header responsivo */}
            <CardHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
              <CardTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 md:text-[#10b981]" />
                </div>
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </CardTitle>
              <CardDescription className="text-[#71717a] text-sm hidden md:block">
                {editingAppointment ? 'Atualize os dados do agendamento' : 'Preencha os dados do agendamento'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 mt-3 md:mt-4 overflow-y-auto flex-1 px-4 sm:px-6">
              {/* Exibir erro do backend */}
              {backendError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">⚠️</span>
                    <p className="text-red-400 text-sm font-medium">{backendError}</p>
                  </div>
                </div>
              )}
              
              {/* Seção de Cliente */}
              <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 p-3 md:p-4 rounded-lg border border-emerald-500/20 md:border-[#27272a] md:bg-[#0a0a0a]/50">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 md:bg-[#10b981] rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm md:text-base">Cliente</h3>
                </div>
                
                <div>
                  <Label htmlFor="client" className="text-[#ededed] text-sm font-medium">
                    Buscar Cliente *
                  </Label>
                  <div className="relative mt-2" data-client-dropdown>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
                      <Input
                        placeholder="Buscar cliente por nome, telefone ou email..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value)
                          setIsClientDropdownOpen(true)
                        }}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] pl-10 pr-10 h-10 md:h-11"
                      />
                      <ChevronDown 
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a] cursor-pointer" 
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      />
                    </div>
                    
                    {/* Cliente selecionado */}
                    {newAppointment.endUserId && (
                      <div className="mt-2 flex items-center justify-between bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#10b981]" />
                          <span className="text-[#ededed] text-sm">
                            {clients.find(c => c.id === newAppointment.endUserId)?.name} - {clients.find(c => c.id === newAppointment.endUserId)?.phone}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNewAppointment(prev => ({...prev, endUserId: ""}))
                            setClientSearchTerm("")
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-500/20"
                        >
                          <X className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Dropdown de resultados */}
                    {isClientDropdownOpen && (
                      <div className="absolute z-[70] w-full mt-1 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <div
                              key={client.id}
                              className="p-3 hover:bg-[#27272a] cursor-pointer border-b border-[#27272a]/50 last:border-b-0 transition-colors"
                              onClick={() => {
                                setNewAppointment(prev => ({...prev, endUserId: client.id}))
                                setClientSearchTerm(client.name)
                                setIsClientDropdownOpen(false)
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="text-[#ededed] text-sm font-medium">{client.name}</span>
                                <span className="text-[#71717a] text-xs">{client.phone}</span>
                                {client.email && <span className="text-[#71717a] text-xs">{client.email}</span>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-[#71717a] text-sm">
                            {clientSearchTerm ? "Nenhum cliente encontrado" : "Digite para buscar clientes"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção de Serviço e Profissional */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 md:hidden">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm">Serviço & Profissional</h3>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <Label htmlFor="service" className="text-[#ededed] text-sm font-medium">
                      Serviço *
                    </Label>
                    <Select 
                      value={newAppointment.serviceId} 
                      onValueChange={(value) => {
                        setNewAppointment(prev => ({...prev, serviceId: value}))
                      }}
                    >
                      <SelectTrigger className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] h-10 md:h-11 mt-2">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] md:bg-[#18181b] border-[#27272a]">
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id} className="text-[#ededed] hover:bg-[#27272a] focus:bg-[#27272a]">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{service.name}</span>
                              <span className="text-xs text-emerald-400 md:text-[#71717a]">
                                {formatCurrency(service.price)} • {service.duration || 0}min
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="professional" className="text-[#ededed] text-sm font-medium">
                      Profissional
                    </Label>
                    <Select 
                      value={newAppointment.professionalId} 
                      onValueChange={(value) => {
                        setNewAppointment(prev => ({...prev, professionalId: value}))
                      }}
                    >
                      <SelectTrigger className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] h-10 md:h-11 mt-2">
                        <SelectValue placeholder="Selecione um profissional (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] border-[#27272a]">
                        {professionalsData?.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id} className="text-[#ededed] hover:bg-[#27272a] focus:bg-[#27272a]">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{professional.name}</span>
                              <span className="text-xs text-emerald-400 md:text-[#71717a]">{professional.specialty}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção de Data e Horário */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 md:hidden">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm">Data & Horário</h3>
                </div>
                
                {/* Layout otimizado para mobile */}
                <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-[#ededed] text-sm font-medium">
                      Data *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) => {
                        setNewAppointment(prev => ({...prev, date: e.target.value, time: ""}))
                      }}
                      className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] h-10 md:h-11 w-full min-w-0 block"
                    />
                    {newAppointment.date && (
                      <div className="mt-2">
                        {(() => {
                          const dateStatus = getDateStatus()
                          if (dateStatus.isOpen === false) {
                            return (
                              <p className="text-xs text-red-400 flex items-start gap-1">
                                <span className="flex-shrink-0">❌</span>
                                <span className="break-words leading-tight">{dateStatus.message}</span>
                              </p>
                            )
                          } else if (dateStatus.isOpen === true) {
                            return (
                              <p className="text-xs text-[#10b981] flex items-start gap-1">
                                <span className="flex-shrink-0">✅</span>
                                <span className="break-words leading-tight">{dateStatus.message}</span>
                              </p>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-[#ededed] text-sm font-medium">
                      Horário *
                    </Label>
                    <Select 
                      value={newAppointment.time} 
                      onValueChange={(value) => {
                        setNewAppointment(prev => ({...prev, time: value}))
                      }}
                      disabled={!newAppointment.date || !newAppointment.serviceId || !getDateStatus().isOpen}
                    >
                      <SelectTrigger className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] h-10 md:h-11 w-full min-w-0">
                        <SelectValue placeholder={
                          !newAppointment.date ? "Data primeiro" :
                          !newAppointment.serviceId ? "Serviço primeiro" :
                          !getDateStatus().isOpen ? "Fechado" :
                          "Selecione horário"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181b] border-[#27272a] max-h-48 z-[60]">
                        {loadingTimeSlots ? (
                          <SelectItem value="" disabled className="text-[#a1a1aa]">
                            Carregando horários...
                          </SelectItem>
                        ) : availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time: string) => {
                            const isPast = isTimeInPast(newAppointment.date, time)
                            return (
                              <SelectItem key={time} value={time} className="text-sm text-[#ededed] hover:bg-[#27272a] focus:bg-[#27272a]">
                                <div className="flex items-center justify-between w-full">
                                  <span>{isPast ? '⏱️ ' : ''}{time}</span>
                                  {isPast && <span className="text-xs text-[#a1a1aa] ml-2">(retroativo)</span>}
                                </div>
                              </SelectItem>
                            )
                          })
                        ) : (
                          <div className="p-3 text-center text-[#a1a1aa] text-sm">
                            {!newAppointment.date ? "Selecione uma data" :
                             !newAppointment.serviceId ? "Selecione um serviço" :
                             !getDateStatus().isOpen ? "Estabelecimento fechado" :
                             "Nenhum horário disponível"
                            }
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {newAppointment.date && newAppointment.serviceId && (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-[#a1a1aa] break-words leading-tight">
                          {loadingTimeSlots ? 'Carregando horários...' : 
                           getDateStatus().isOpen ? 
                            `${availableTimeSlots.length} horários disponíveis` : 
                            'Estabelecimento fechado neste dia'
                          }
                        </p>
                        {!loadingTimeSlots && availableTimeSlots.some((time: string) => isTimeInPast(newAppointment.date, time)) && (
                          <p className="text-xs text-[#d97706] flex items-start gap-1">
                            <span className="flex-shrink-0">⏱️</span>
                            <span className="break-words leading-tight">Horários com ⏱️ são retroativos</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#ededed] text-sm font-medium">
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o agendamento..."
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment(prev => ({...prev, notes: e.target.value}))}
                  className="bg-[#27272a]/50 md:bg-[#18181b] border-[#3f3f46] md:border-[#27272a] text-[#ededed] min-h-16 md:min-h-20 max-h-20 md:max-h-none overflow-y-auto md:overflow-y-visible text-sm resize-none mt-2"
                />
              </div>
            </CardContent>
            
            {/* Botões responsivos */}
            <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewAppointmentOpen(false)
                  setEditingAppointment(null)
                  resetForm()
                }}
                className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔍 Botão clicado - Estado atual:', {
                      endUserId: newAppointment.endUserId,
                      serviceId: newAppointment.serviceId,
                      date: newAppointment.date,
                      time: newAppointment.time,
                      isEditing: !!editingAppointment
                    })
                  }
                  if (editingAppointment) {
                    handleUpdateAppointment()
                  } else {
                    handleCreateAppointment()
                  }
                }}
                disabled={
                  !newAppointment.endUserId || 
                  !newAppointment.serviceId || 
                  !newAppointment.date || 
                  !newAppointment.time || 
                  isCreating || 
                  isValidating ||
                  !getDateStatus().isOpen
                }
                className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-10 md:min-h-[44px]"
              >
                {isCreating ? 
                  (editingAppointment ? "Atualizando..." : "Criando...") : 
                  isValidating ? "Validando..." :
                  !getDateStatus().isOpen ? "Estabelecimento Fechado" :
                  (editingAppointment ? "Atualizar" : "Criar Agendamento")
                }
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({
            isOpen: false,
            type: null,
            appointmentId: '',
            clientName: '',
            serviceName: ''
          })
        }
      }}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-lg mx-auto h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
          {/* Header Fixo */}
          <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmDialog.type === 'cancel' 
                  ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                  : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}>
                {confirmDialog.type === 'cancel' ? (
                  <XCircle className="w-5 h-5 text-white" />
                ) : (
                  <Trash2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-[#ededed] text-lg md:text-xl font-semibold">
                  {confirmDialog.type === 'cancel' ? 'Cancelar Agendamento' : 'Excluir Agendamento'}
                </DialogTitle>
                <DialogDescription className="text-[#a1a1aa] text-sm md:text-base">
                  {confirmDialog.type === 'cancel'
                    ? 'Tem certeza que deseja cancelar este agendamento?'
                    : 'Tem certeza que deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita.'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Conteúdo com informações do agendamento */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
            <div className={`bg-gradient-to-br p-3 md:p-4 rounded-lg border space-y-3 md:space-y-4 ${
              confirmDialog.type === 'cancel'
                ? 'from-amber-500/10 to-amber-600/5 border-amber-500/20'
                : 'from-red-500/10 to-red-600/5 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                  confirmDialog.type === 'cancel' ? 'bg-amber-400' : 'bg-red-400'
                }`}></div>
                <h3 className="text-[#ededed] font-medium text-sm md:text-base">Detalhes do Agendamento</h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[#71717a] text-xs md:text-sm">Cliente</label>
                  <div className={`border rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base font-medium ${
                    confirmDialog.type === 'cancel'
                      ? 'bg-[#27272a]/70 border-amber-500/30'
                      : 'bg-[#27272a]/70 border-red-500/30'
                  }`}>
                    {confirmDialog.clientName}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[#71717a] text-xs md:text-sm">Serviço</label>
                  <div className={`border rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base ${
                    confirmDialog.type === 'cancel'
                      ? 'bg-[#27272a]/70 border-amber-500/30'
                      : 'bg-[#27272a]/70 border-red-500/30'
                  }`}>
                    {confirmDialog.serviceName}
                  </div>
                </div>
                
                {confirmDialog.type === 'delete' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mt-3">
                    <p className="text-red-400 text-xs md:text-sm">
                      ⚠️ Este agendamento será removido permanentemente do sistema e não poderá ser recuperado.
                    </p>
                  </div>
                )}
                
                {confirmDialog.type === 'cancel' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 mt-3">
                    <p className="text-amber-400 text-xs md:text-sm">
                      ℹ️ O agendamento será marcado como cancelado e não poderá ser reagendado posteriormente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="border-t border-[#27272a] pt-3 md:pt-4 px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({
                  isOpen: false,
                  type: null,
                  appointmentId: '',
                  clientName: '',
                  serviceName: ''
                })}
                className="border-[#27272a] hover:bg-[#27272a] w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={`w-full sm:w-auto ${
                  confirmDialog.type === 'cancel'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmDialog.type === 'cancel' ? 'Cancelar Agendamento' : 'Excluir Permanentemente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
