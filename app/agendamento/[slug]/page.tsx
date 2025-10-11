"use client"

import { 
  Check,
  Loader2,
  ChevronLeft,
  Calendar,
  Scissors,
  User,
  Clock,
  Wallet,
  Info,
  Target,
  Smartphone,
  PartyPopper,
  ChevronRight,
  Users,
  MapPin,
  Phone,
  Star,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Briefcase,
  Layers,
  Lightbulb
} from "lucide-react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  utcToBrazil, 
  parseDateTime, 
  formatBrazilTime, 
  formatBrazilDate,
  formatBrazilDateOnly,
  getBrazilDayOfWeek,
  getBrazilDayNumber,
  getBrazilNow,
  toBrazilDateString,
  debugTimezone,
  parseDate,
  toLocalISOString,
  toLocalDateString
} from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"

// Types
interface BusinessData {
  id: string
  businessName: string
  businessPhone?: string
  businessAddress?: string
  businessLogo?: string
  businessInstagram?: string
  name: string
  avatar?: string
  specialty?: string
}

// Interface mínima para profissionais usada nesta página
interface Professional {
  id: string
  name: string
  avatar?: string
  specialty?: string
}

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  image?: string
}

interface CustomerData {
  name: string
  phone: string
  email: string
  birthDate?: string
  notes?: string
}

export default function AgendamentoPage() {
  const params = useParams()
  const { toast } = useToast()
  
  // Estados principais
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dados do negócio
  const [businessData, setBusinessData] = useState<BusinessData | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  
  // Estados do formulário
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [addedUpsells, setAddedUpsells] = useState<Service[]>([]) // ✅ Inicia com um array vazio
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    notes: ""
  })
  
  // Estados para UI
  const [expandedPeriods, setExpandedPeriods] = useState<{
    morning: boolean | undefined,
    afternoon: boolean | undefined,
    night: boolean | undefined
  }>({
    morning: undefined,
    afternoon: undefined,
    night: undefined
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Créditos de pacote (página pública)
  const [availableCredits, setAvailableCredits] = useState<number>(0)
  const [creditExpiresAt, setCreditExpiresAt] = useState<string | null>(null)
  const [creditInfoLoading, setCreditInfoLoading] = useState<boolean>(false)
  
  // Estados para formulário inteligente de cliente
  const [searchingClient, setSearchingClient] = useState(false)
  const [clientFound, setClientFound] = useState<boolean | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [phoneDebounceTimer, setPhoneDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // AbortControllers para cancelar requisições (simplificado)
  const [clientSearchAbortController, setClientSearchAbortController] = useState<AbortController | null>(null)

  // Estado para controlar visibilidade dos detalhes do estabelecimento
  const [isDetailsVisible, setIsDetailsVisible] = useState(false)

  // Estado para controlar o modal de upsell
  const [showUpsellModal, setShowUpsellModal] = useState(false)

  // Carregar dados do negócio
  useEffect(() => {
    loadBusinessData()
  }, [params.slug])

  const loadBusinessData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar dados do negócio
      const businessResponse = await fetch(`/api/public/business/${params.slug}`)
      if (!businessResponse.ok) {
        throw new Error('Estabelecimento não encontrado')
      }
      const business = await businessResponse.json()
      setBusinessData(business)

      // Carregar dados em paralelo (removido working-hours - não é mais necessário)
      const [servicesRes, professionalsRes] = await Promise.all([
        fetch(`/api/public/business/${params.slug}/services`),
        fetch(`/api/public/business/${params.slug}/professionals`)
      ])

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData)
      }

      if (professionalsRes.ok) {
        const professionalsData = await professionalsRes.json()
        setProfessionals(professionalsData)
        
        // Auto-selecionar se houver apenas um profissional
        if (professionalsData.length === 1) {
          setSelectedProfessional(professionalsData[0])
        }
      }

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados do estabelecimento')
    } finally {
      setLoading(false)
    }
  }

  // Obter serviço principal selecionado
  const getMainService = () => {
    if (!selectedServiceId || !services || services.length === 0) {
      return null
    }
    return services.find(service => service.id === selectedServiceId) || null
  }

  // Calcular totais do pacote (principal + complementos)
  const calculateTotals = () => {
    const mainService = getMainService()
    
    // Verificar se o serviço principal existe e tem propriedades válidas
    const mainPrice = mainService?.price ? Number(mainService.price) : 0
    const mainDuration = mainService?.duration ? Number(mainService.duration) : 0
    
    // A expressão (addedUpsells || []) garante que se 'addedUpsells' for null, usaremos um array vazio
    const upsellPrice = (addedUpsells || []).reduce((total, service) => total + (service?.price ? Number(service.price) : 0), 0)
    const upsellDuration = (addedUpsells || []).reduce((total, service) => total + (service?.duration ? Number(service.duration) : 0), 0)
    
    const totalPrice = mainPrice + upsellPrice
    const totalDuration = mainDuration + upsellDuration
    
    return { 
      totalPrice, 
      totalDuration 
    }
  }

  // Obter opções de upsell para o serviço selecionado
  const getUpsellOptions = (mainServiceId: string) => {
    if (!services || services.length === 0 || !mainServiceId) {
      return []
    }
    
    return services.filter(service => 
      service?.id !== mainServiceId && 
      !(addedUpsells || []).some(added => added?.id === service?.id)
    )
  }

  // Selecionar serviço principal (substitui seleção anterior)
  const handleSelectMainService = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    setAddedUpsells([]) // Reset complementos ao trocar serviço principal
    setShowUpsellModal(true) // Abrir modal para upsells
  }

  // Adicionar complemento (upsell)
  const handleAddUpsell = (service: Service) => {
    setAddedUpsells(prev => [...prev, service])
  }

  // Remover complemento
  const handleRemoveUpsell = (serviceId: string) => {
    setAddedUpsells(prev => (prev || []).filter(service => service.id !== serviceId))
  }

  // Função simplificada - não precisa mais verificar conflitos pois a API availability-v2 já faz isso
  const isTimeSlotAvailable = (time: string) => {
    // A API availability-v2 já retorna slots com disponibilidade calculada
    // Esta função é mantida apenas para compatibilidade, mas agora consulta os availableSlots
    const slot = availableSlots.find(s => s.time === time)
    return slot?.available ?? false
  }

  // Carregar slots disponíveis quando data, profissional ou serviço mudarem
  useEffect(() => {
    const loadSlots = async () => {
      if (selectedDate && selectedServiceId && selectedProfessional) {
        const slots = await generateAvailableSlots(selectedDate)
        setAvailableSlots(slots)
      } else {
        setAvailableSlots([])
      }
    }
    
    loadSlots()
  }, [selectedDate, selectedProfessional?.id, selectedServiceId, params.slug])

  // Verificar disponibilidade de dias quando profissional é selecionado
  useEffect(() => {
    const checkDays = async () => {
      if (selectedProfessional && selectedProfessional.id !== 'any') {
        // Limpar cache anterior
        setDayAvailability({})
        
        // Verificar TODOS os 30 dias que são exibidos ao usuário
        const promises = []
        for (let i = 0; i < 30; i++) {
          const date = new Date()
          date.setDate(date.getDate() + i)
          const dateString = toBrazilDateString(date)
          promises.push(checkDayAvailability(dateString, selectedProfessional.id))
        }
        
        // Executar verificações em lotes para não sobrecarregar
        const batchSize = 10
        for (let i = 0; i < promises.length; i += batchSize) {
          const batch = promises.slice(i, i + batchSize)
          await Promise.all(batch)
          // Pequena pausa entre lotes para não sobrecarregar
          if (i + batchSize < promises.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      } else if (selectedProfessional === null) {
        // Para "Qualquer profissional", limpar cache
        setDayAvailability({})
      }
    }
    
    checkDays()
  }, [selectedProfessional?.id, params.slug])

  // Resetar estado das seções quando a data mudar para usar lógica inteligente
  useEffect(() => {
    if (selectedDate) {
      setExpandedPeriods({
        morning: undefined,
        afternoon: undefined,
        night: undefined
      })
    }
  }, [selectedDate])

  // Estados para slots disponíveis vindos diretamente da API availability-v2
  const [availableSlots, setAvailableSlots] = useState<{
    time: string,
    available: boolean,
    occupied: boolean,
    period: 'morning' | 'afternoon' | 'night'
  }[]>([])

  // Estado para controlar dias disponíveis/folga por data
  const [dayAvailability, setDayAvailability] = useState<Record<string, {
    available: boolean,
    reason?: string,
    loading?: boolean
  }>>({})
  const generateAvailableSlots = async (date: string) => {
    if (!selectedServiceId || !selectedProfessional) return []

    try {
      const professionalId = selectedProfessional.id

      if (!professionalId) return []

      const url = new URL(`/api/public/business/${params.slug}/availability-v2`, window.location.origin)
      url.searchParams.set('date', date)
      url.searchParams.set('professionalId', professionalId)
      url.searchParams.set('serviceDuration', calculateTotals().totalDuration.toString())
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        console.error('Erro ao buscar disponibilidade:', response.statusText)
        return []
      }

      const data = await response.json()
      
      // Usar DIRETAMENTE os slots da API availability-v2
      const slots = data.slots?.map((slot: any) => ({
        time: slot.time,
        available: slot.available,
        occupied: !slot.available,
        period: (() => {
          const hour = parseInt(slot.time.split(':')[0])
          // ✅ CORRIGIDO: Madrugada (0-5h) = night, Manhã (6-11h) = morning
          if (hour >= 6 && hour < 12) return 'morning'
          if (hour >= 12 && hour < 18) return 'afternoon'
          return 'night'  // 18-23h + 0-5h (madrugada)
        })() as 'morning' | 'afternoon' | 'night'
      })) || []

      return slots
    } catch (error) {
      console.error('Erro ao buscar slots disponíveis:', error)
      return []
    }
  }

  // Função para verificar se um dia específico está disponível para o profissional
  const checkDayAvailability = async (dateString: string, professionalId: string) => {
    if (!professionalId || professionalId === 'any') return true
    
    // Verificar cache primeiro
    if (dayAvailability[dateString] && !dayAvailability[dateString].loading) {
      return dayAvailability[dateString].available
    }
    
    // Marcar como loading
    setDayAvailability(prev => ({
      ...prev,
      [dateString]: { available: false, loading: true }
    }))
    
    try {
      const url = new URL(`/api/public/business/${params.slug}/availability-v2`, window.location.origin)
      url.searchParams.set('date', dateString)
      url.searchParams.set('professionalId', professionalId)
      url.searchParams.set('serviceDuration', '30') // Duração mínima para teste
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        console.error(`Erro ao verificar disponibilidade para ${dateString}:`, response.statusText)
        setDayAvailability(prev => ({
          ...prev,
          [dateString]: { available: false, reason: 'Indisponível', loading: false }
        }))
        return false
      }

      const data = await response.json()
      
      // Se não há workingHours, significa que é folga
      const isAvailable = data.workingHours !== null
      const reason = isAvailable ? 'Disponível' : 'Profissional não trabalha neste dia'
      
      setDayAvailability(prev => ({
        ...prev,
        [dateString]: { available: isAvailable, reason, loading: false }
      }))
      
      return isAvailable
      
    } catch (error) {
      console.error(`Erro ao verificar disponibilidade para ${dateString}:`, error)
      setDayAvailability(prev => ({
        ...prev,
        [dateString]: { available: false, reason: 'Erro na verificação', loading: false }
      }))
      return false
    }
  }

  // Agrupar horários por período
  const groupSlotsByPeriod = (slots: any[]) => {
    const groups = {
      morning: slots.filter(slot => slot.period === 'morning'),
      afternoon: slots.filter(slot => slot.period === 'afternoon'),
      night: slots.filter(slot => slot.period === 'night')
    }
    
    return groups
  }

  // Calcular estado inicial inteligente das seções baseado na hora atual
  const calculateInitialExpandedState = (groupedSlots: any) => {
    if (!selectedDate) return { morning: false, afternoon: false, night: false }
    
    // Verificar se é hoje
    const selectedDateParsed = parseDate(selectedDate)
    const now = getBrazilNow()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDateOnly = new Date(selectedDateParsed.getFullYear(), selectedDateParsed.getMonth(), selectedDateParsed.getDate())
    
    // Se não é hoje, manter todas as seções minimizadas
    if (selectedDateOnly.getTime() !== today.getTime()) {
      return { 
        morning: false, 
        afternoon: false, 
        night: false 
      }
    }
    
    const nowHour = now.getHours()
    
    // Verificar se cada seção tem horários disponíveis
    const morningHasAvailable = groupedSlots.morning.some((slot: any) => slot.available)
    const afternoonHasAvailable = groupedSlots.afternoon.some((slot: any) => slot.available)
    const nightHasAvailable = groupedSlots.night.some((slot: any) => slot.available)
    
    return {
      morning: morningHasAvailable && nowHour < 12, // Só abrir se tem horários E é manhã
      afternoon: afternoonHasAvailable && (nowHour >= 12 && nowHour < 18), // Só abrir se tem horários E é tarde
      night: nightHasAvailable && nowHour >= 18 // Só abrir se tem horários E é noite
    }
  }

  // Determinar qual período pertence o horário selecionado
  const getSelectedTimePeriod = (time: string) => {
    if (!time) return null;
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 || hour < 6) return 'night';
    return null;
  }

  // Busca inteligente de cliente por telefone
  const searchClientByPhone = async (phone: string) => {
    if (phone.length < 10) {
      setClientFound(null)
      setShowClientForm(false)
      return
    }

    // Cancelar busca anterior se ainda estiver em andamento
    if (clientSearchAbortController) {
      clientSearchAbortController.abort()
    }

    // Criar novo AbortController para esta busca
    const abortController = new AbortController()
    setClientSearchAbortController(abortController)

    setSearchingClient(true)
    setClientFound(null)

    try {
      const response = await fetch(`/api/public/clients/search?phone=${phone}&businessSlug=${params.slug}`, {
        signal: abortController.signal
      })
      
      // Verificar se a requisição foi cancelada
      if (abortController.signal.aborted) {
        return
      }
      
      if (response.ok) {
        const clientData = await response.json()
        
        // Cliente encontrado
        setCustomerData(prev => ({
          ...prev,
          name: clientData.name || "",
          email: clientData.email || "",
          birthDate: clientData.birthday ? toLocalDateString(new Date(clientData.birthday)) : "",
          notes: clientData.notes || ""
        }))
        
        setClientFound(true)
        setShowClientForm(true)
        
        toast({
          title: "Cliente encontrado!",
          description: "Dados preenchidos automaticamente.",
        })
      } else {
        // Cliente não encontrado
        setCustomerData(prev => ({
          ...prev,
          name: "",
          email: "",
          birthDate: "",
          notes: ""
        }))
        
        setClientFound(false)
        setShowClientForm(true)
      }
    } catch (error: any) {
      // Ignorar erros de cancelamento
      if (error.name === 'AbortError') {
        return
      }
      console.error('Erro ao buscar cliente:', error)
      setClientFound(false)
      setShowClientForm(true)
    } finally {
      // Só atualizar loading se não foi cancelado
      if (!abortController.signal.aborted) {
        setSearchingClient(false)
        setClientSearchAbortController(null)
      }
    }
  }

  // Handler com debounce para busca de cliente
  const handlePhoneChange = (phone: string) => {
    setCustomerData(prev => ({ ...prev, phone }))
    
    // Limpar timer anterior
    if (phoneDebounceTimer) {
      clearTimeout(phoneDebounceTimer)
    }

    // Resetar estados se telefone estiver vazio
    if (phone.length === 0) {
      setClientFound(null)
      setShowClientForm(false)
      setSearchingClient(false)
      return
    }

    // Configurar novo timer para busca com debounce
    const timer = setTimeout(() => {
      searchClientByPhone(phone)
    }, 800) // 800ms de debounce
    
    setPhoneDebounceTimer(timer)
  }

  // Função para aplicar máscara de telefone brasileiro
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '')
    
    // Aplica a máscara (99) 99999-9999
    if (cleaned.length <= 2) {
      return cleaned
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    } else if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    
    // Limita a 11 dígitos
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
  }

  // Handler para input de telefone com máscara
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    if (rawValue.length <= 11) {
      handlePhoneChange(rawValue)
    }
  }

  // Limpar timers e AbortControllers ao desmontar componente
  useEffect(() => {
    return () => {
      // Limpar timer de debounce
      if (phoneDebounceTimer) {
        clearTimeout(phoneDebounceTimer)
      }
      
      // Cancelar requisições em andamento
      if (clientSearchAbortController) {
        clientSearchAbortController.abort()
      }
    }
  }, [phoneDebounceTimer, clientSearchAbortController])

  // Validar formulário
  const validateAppointmentData = () => {
    const errors = []

    // Validar serviço principal
    if (!selectedServiceId) {
      errors.push("Selecione um serviço")
    } else {
      // Verificar se o serviço existe e é válido
      const mainService = getMainService()
      if (!mainService) {
        errors.push("Serviço selecionado não encontrado")
      } else {
        // Verificar se o serviço tem dados essenciais
        if (!mainService.price || mainService.price <= 0) {
          errors.push("Serviço selecionado não possui preço válido")
        }
        if (!mainService.duration || mainService.duration <= 0) {
          errors.push("Serviço selecionado não possui duração válida")
        }
      }
    }

    // Validar upsells adicionados
    if (addedUpsells && addedUpsells.length > 0) {
      (addedUpsells || []).forEach((upsell, index) => {
        if (!upsell || !upsell.id) {
          errors.push(`Complemento ${index + 1} inválido`)
        } else if (!upsell.price || upsell.price <= 0) {
          errors.push(`Complemento "${upsell.name || 'sem nome'}" não possui preço válido`)
        } else if (!upsell.duration || upsell.duration <= 0) {
          errors.push(`Complemento "${upsell.name || 'sem nome'}" não possui duração válida`)
        }
      })
    }

    // Validar totais calculados
    try {
      const { totalPrice, totalDuration } = calculateTotals()
      if (!totalPrice || totalPrice <= 0) {
        errors.push("Preço total inválido")
      }
      if (!totalDuration || totalDuration <= 0) {
        errors.push("Duração total inválida")
      }
    } catch (error) {
      errors.push("Erro ao calcular totais do agendamento")
    }

    // Validar data
    if (!selectedDate) {
      errors.push("Selecione uma data")
    } else {
      // Verificar se a data não é no passado
      if (selectedTime) {
        // Se tem horário selecionado, validar data + horário
        const selectedDateTime = parseDateTime(selectedDate, selectedTime)
        const now = getBrazilNow()
        if (selectedDateTime < now) {
          errors.push("Data e horário não podem ser no passado")
        }
      } else {
        // Se não tem horário, validar apenas a data (modo compatibilidade)
        const selectedDateParsed = parseDate(selectedDate)
        const now = getBrazilNow()
        if (selectedDateParsed < now) {
          errors.push("Data não pode ser no passado")
        }
      }
    }

    // Validar horário
    if (!selectedTime) {
      errors.push("Selecione um horário")
    }

    // Validar dados do cliente
    if (!customerData.name.trim()) {
      errors.push("Nome é obrigatório")
    }

    if (!customerData.phone.trim()) {
      errors.push("Telefone é obrigatório")
    } else {
      // Validação básica de telefone brasileiro
      const phoneRegex = /^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/
      if (!phoneRegex.test(customerData.phone.replace(/\D/g, ''))) {
        errors.push("Telefone inválido")
      }
    }

    if (!customerData.email.trim()) {
      errors.push("E-mail é obrigatório")
    } else {
      // Validação de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(customerData.email)) {
        errors.push("E-mail inválido")
      }
    }

    return errors
  }

  // Sanitizar dados de entrada
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  // Criar agendamento público
  const handleCreateAppointment = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [DEBUG] Iniciando handleCreateAppointment')
    }
    
    // Validar dados
    const validationErrors = validateAppointmentData()
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 [DEBUG] Validação:', validationErrors)
    }
    
    if (validationErrors.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [DEBUG] Validação falhou, parando execução')
      }
      toast({
        title: "Dados inválidos",
        description: validationErrors.join(", "),
        variant: "destructive"
      })
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('⚡ [DEBUG] isSubmitting estado atual:', isSubmitting)
    }
    
    // Verificar se já não está processando (evitar múltiplos submits)
    if (isSubmitting) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [DEBUG] Já está processando, parando execução')
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [DEBUG] Iniciando processo de criação do agendamento')
    }
    setIsSubmitting(true)
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [DEBUG] Criando dateTime...')
      }
      // 🇧🇷 Criar dateTime usando timezone brasileiro e converter para UTC
      const appointmentDateTime = parseDateTime(selectedDate, selectedTime)
      debugTimezone(appointmentDateTime, 'Frontend Público - Criando agendamento')

      // Sanitizar dados de entrada
      const mainService = getMainService()
      
      // Verificar se o serviço principal existe
      if (!mainService) {
        throw new Error("Serviço principal não encontrado")
      }
      
      // Filtrar upsells válidos (remover qualquer item null/undefined)
      const validUpsells = (addedUpsells || []).filter(upsell => upsell && upsell.id && upsell.price && upsell.duration)
      
      // Combinar todos os serviços em um array (compatível com API existente)
      const allServiceIds = [mainService.id, ...validUpsells.map(upsell => upsell.id)]
      
      const sanitizedData: any = {
        businessSlug: params.slug as string,
        clientName: sanitizeInput(customerData.name),
        clientPhone: sanitizeInput(customerData.phone),
        clientEmail: sanitizeInput(customerData.email),
        clientBirthDate: customerData.birthDate || null,
        professionalId: selectedProfessional?.id || null,
        serviceId: mainService.id, // Serviço principal (compatível com API)
        services: allServiceIds, // Array completo com principal + complementos
        appointmentDateTime: toLocalISOString(appointmentDateTime), // 🇧🇷 Envia horário brasileiro para o backend
        notes: customerData.notes ? sanitizeInput(customerData.notes) : null
      }

      // Se houver crédito disponível, informar intenção de uso
      if (availableCredits > 0) {
        sanitizedData.usePackageCredit = true
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 [DEBUG] Dados sanitizados:', sanitizedData)
        console.log('📡 [DEBUG] Fazendo chamada para API...')
      }

      const response = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedData)
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('📨 [DEBUG] Resposta da API recebida - Status:', response.status)
      }
      
      const result = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('📄 [DEBUG] Resultado da API:', result)
      }

      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ [DEBUG] API retornou erro, indo para catch')
        }
        throw new Error(result.message || 'Erro ao criar agendamento')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [DEBUG] Agendamento criado com sucesso:', result)
      }

      toast({
        title: "✅ Sucesso!",
        description: "Agendamento criado com sucesso!",
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [DEBUG] Navegando para etapa 7...')
      }
      // Navegar para a etapa de sucesso
      setStep(7)
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [DEBUG] setStep(7) executado!')
      }

    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [DEBUG] Erro capturado no catch:', error)
      }
      
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [DEBUG] Executando finally - setIsSubmitting(false)')
      }
      setIsSubmitting(false)
    }
  }

  // -------- Créditos: helpers e busca pública (combo exato) --------
  const [isCoveredBySubscription, setIsCoveredBySubscription] = useState(false)
  const [coverageMessage, setCoverageMessage] = useState<string>("")

  const fetchPublicCredits = async () => {
    try {
      if (!selectedServiceId) return
      const rawPhone = customerData.phone.replace(/\D/g, '')
      if (rawPhone.length < 10) return
      setCreditInfoLoading(true)
  setAvailableCredits(0)
      setCreditExpiresAt(null)
  setIsCoveredBySubscription(false)
  setCoverageMessage("")

      const allServiceIds = [selectedServiceId, ...((addedUpsells || []).map(u => u.id))]
      const url = new URL(`/api/public/client-coverage-combo`, window.location.origin)
      url.searchParams.set('businessSlug', String(params.slug))
      url.searchParams.set('phone', rawPhone)
      url.searchParams.set('serviceIds', allServiceIds.join(','))

      const res = await fetch(url.toString())
      if (!res.ok) {
        setAvailableCredits(0)
        setCreditExpiresAt(null)
        return
      }
      const data = await res.json()
      if (data.coveredBy === 'subscription') {
        // Assinatura cobre totalmente
        setIsCoveredBySubscription(true)
        setCoverageMessage(data.message || 'Coberto por assinatura')
        setAvailableCredits(0)
        setCreditExpiresAt(null)
      } else if (data.coveredBy === 'package' && data.package) {
        setAvailableCredits(Number(data.package.creditsRemaining || 0))
        setCreditExpiresAt(data.package.expiresAt || null)
        setIsCoveredBySubscription(false)
        setCoverageMessage("")
      } else {
        setAvailableCredits(0)
        setCreditExpiresAt(null)
        setIsCoveredBySubscription(false)
        setCoverageMessage("")
      }
    } catch (e) {
      console.error('Erro ao buscar créditos públicos (combo):', e)
      setAvailableCredits(0)
      setCreditExpiresAt(null)
    } finally {
      setCreditInfoLoading(false)
    }
  }

  // Buscar créditos quando telefone e serviços estiverem definidos (inclui upsells)
  useEffect(() => {
    if (selectedServiceId && customerData.phone) {
      fetchPublicCredits()
    } else {
      setAvailableCredits(0)
      setCreditExpiresAt(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId, addedUpsells.length, customerData.phone, params.slug])

  // Total efetivo considerando uso de crédito por combo exato
  const getEffectiveTotalPrice = () => {
    const base = calculateTotals().totalPrice
    if (isCoveredBySubscription) return 0
    if (availableCredits > 0) {
      // Combo coberto: preço total vira 0
      return 0
    }
    // Assinatura ativa e cobrindo todos os serviços: preço 0
    return base
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-[#a1a1aa]">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Ops!</h1>
          <p className="text-[#a1a1aa] mb-6">{error}</p>
          <Button onClick={loadBusinessData} className="bg-[#27272a] hover:bg-[#3f3f46]">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#a1a1aa]">Estabelecimento não encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header do Negócio */}
          <Card className="bg-[#18181b] border-[#27272a] mb-6">
            <CardHeader className="text-center">
              {businessData.businessLogo && (
                <div className="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden bg-[#27272a]">
                  <img 
                    src={businessData.businessLogo} 
                    alt={businessData.businessName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardTitle className="text-2xl text-[#ededed]">
                {businessData.businessName}
              </CardTitle>
              <CardDescription className="text-[#a1a1aa] mb-4">
                Agende seu horário de forma rápida e fácil
              </CardDescription>
              
              {/* Modal de Detalhes - Melhorado */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="mx-auto border-[#27272a] text-[#ededed] hover:border-tymer-primary hover:bg-tymer-primary/10 transition-all duration-300 hover:scale-105"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="w-[90vw] max-w-sm mx-auto max-h-[75vh] md:max-h-none bg-gradient-to-br from-[#18181b] via-[#1f1f23] to-[#18181b] border-[#27272a] rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-y-auto">
                  <DialogHeader className="text-center pb-4">
                    {/* Logo da empresa (se disponível) */}
                    {businessData.businessLogo && (
                      <div className="w-16 h-16 mx-auto mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 border-2 border-tymer-primary/30 shadow-lg">
                        <img 
                          src={businessData.businessLogo} 
                          alt={businessData.businessName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <DialogTitle className="text-[#ededed] text-xl font-bold text-center">
                      {businessData.businessName}
                    </DialogTitle>
                    
                    {/* Linha decorativa */}
                    <div className="w-16 h-1 bg-gradient-to-r from-tymer-primary to-tymer-primary/60 rounded-full mx-auto mt-2"></div>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    {/* Card de Informações de Contato */}
                    <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 rounded-xl p-4 border border-[#3f3f46]/50 backdrop-blur-sm">
                      <h4 className="text-[#ededed] font-semibold mb-3 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-tymer-icon" />
                        Informações de Contato
                      </h4>
                      
                      <div className="space-y-3">
                        {businessData.businessPhone && (
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-[#18181b]/60 border border-[#27272a]/50">
                            <div className="w-8 h-8 rounded-full bg-[#27272a]/60 flex items-center justify-center">
                              <Phone className="h-4 w-4 text-tymer-icon" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#ededed] font-medium text-sm break-all">
                                {businessData.businessPhone}
                              </p>
                              <p className="text-[#71717a] text-xs">Telefone</p>
                            </div>
                          </div>
                        )}
                        
                        {businessData.businessAddress && (
                          <div className="flex items-start gap-3 p-2 rounded-lg bg-[#18181b]/60 border border-[#27272a]/50">
                            <div className="w-8 h-8 rounded-full bg-[#27272a]/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MapPin className="h-4 w-4 text-tymer-icon" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#ededed] font-medium text-sm leading-relaxed break-words">
                                {businessData.businessAddress}
                              </p>
                              <p className="text-[#71717a] text-xs">Endereço</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Card de Ações Rápidas */}
                    <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 rounded-xl p-4 border border-[#3f3f46]/50 backdrop-blur-sm">
                      <h4 className="text-[#ededed] font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-tymer-icon" />
                        Ações Rápidas
                      </h4>
                      
                      <div className="space-y-3">
                        {businessData.businessPhone && (
                          <Button
                            onClick={() => {
                              if (businessData.businessPhone) {
                                const phoneNumber = businessData.businessPhone.replace(/\D/g, '')
                                const whatsappUrl = `https://wa.me/55${phoneNumber}?text=Olá! Gostaria de saber mais sobre os serviços.`
                                window.open(whatsappUrl, '_blank')
                              }
                            }}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-600/25"
                          >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.097"/>
                            </svg>
                            Conversar no WhatsApp
                          </Button>
                        )}
                        
                        {businessData.businessInstagram && (
                          <Button
                            onClick={() => {
                              if (businessData.businessInstagram) {
                                const instagramUrl = businessData.businessInstagram.startsWith('http') 
                                  ? businessData.businessInstagram 
                                  : `https://instagram.com/${businessData.businessInstagram.replace('@', '')}`
                                window.open(instagramUrl, '_blank')
                              }
                            }}
                            variant="outline"
                            className="w-full border-2 border-pink-500/50 text-[#ededed] hover:border-pink-500 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25 bg-gradient-to-r from-pink-500/10 to-purple-500/10"
                          >
                            <svg className="h-5 w-5 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                              Seguir no Instagram
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Rodapé com informação adicional */}
                    <div className="text-center pt-2">
                      <p className="text-[#71717a] text-xs">
                        ✨ Agendamento rápido e fácil
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          {/* Indicador de Progresso */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step === stepNumber 
                      ? 'bg-tymer-primary text-white' 
                      : step > stepNumber 
                        ? 'bg-tymer-primary text-white' 
                        : 'bg-[#27272a] text-[#71717a]'
                    }`}
                >
                  {step > stepNumber ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
              ))}
            </div>
          </div>

          {/* Conteúdo das Etapas */}
          <Card className="bg-[#18181b] border-[#27272a]">
            <CardContent className="p-6">
              
              {/* Etapa 1: Seleção de Serviço Principal com Upsell Integrado */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Escolha seu serviço
                  </h3>
                  
                  {services.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#71717a]">Nenhum serviço disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Lista de Serviços */}
                      {services.map((service) => (
                        <div key={service.id}>
                          {/* Card do Serviço */}
                          <div
                            onClick={() => handleSelectMainService(service.id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-tymer-primary
                              ${selectedServiceId === service.id 
                                ? 'border-tymer-primary bg-tymer-primary/10' 
                                : 'border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a]'
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-[#ededed]">
                                    {service.name}
                                  </h4>
                                  {selectedServiceId === service.id && (
                                    <div className="w-5 h-5 bg-tymer-primary rounded-full flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                {service.description && (
                                  <p className="text-sm text-[#a1a1aa] mb-2">
                                    {service.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-[#71717a]">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{service.duration}min</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>{formatCurrency(service.price)}</span>
                                  </div>
                                </div>
                              </div>
                              {service.image && (
                                <div className="w-16 h-16 ml-4 rounded-lg overflow-hidden bg-[#27272a]">
                                  <img 
                                    src={service.image} 
                                    alt={service.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal de Upsell */}
              <Dialog open={showUpsellModal} onOpenChange={setShowUpsellModal}>
                <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[95vw] max-w-md mx-auto rounded-xl h-[85vh] max-h-[600px] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-xl font-bold text-[#ededed] text-center flex items-center justify-center gap-2">
                      <Target className="h-5 w-5 text-tymer-icon" />
                      Monte seu pacote ideal
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Conteúdo scrollável */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {/* Serviço Principal Selecionado */}
                    {(() => {
                      const mainService = getMainService()
                      return mainService && (
                        <div className="bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 border border-tymer-primary/40 rounded-xl p-3 shadow-lg">
                          <h4 className="font-semibold text-[#ededed] mb-2 flex items-center gap-2 text-xs uppercase tracking-wide">
                            <Briefcase className="h-4 w-4 text-tymer-icon" /> Serviço Principal
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#ededed] text-base truncate">{mainService.name}</p>
                              <p className="text-[#a1a1aa] text-xs font-medium">{mainService.duration} min</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="font-bold text-xl text-[#ededed]">{formatCurrency(mainService.price)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Complementos Adicionados */}
                    {addedUpsells.length > 0 && (
                      <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-xl p-3 shadow-lg">
                        <h4 className="font-semibold text-[#ededed] mb-2 flex items-center gap-2 text-xs uppercase tracking-wide">
                          <Layers className="h-4 w-4 text-tymer-icon" /> Complementos Selecionados
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {addedUpsells.map((upsell) => (
                            <div key={upsell.id} className="flex items-center justify-between p-2 bg-[#27272a]/60 rounded-lg border border-[#3f3f46]/50 hover:border-tymer-primary/40 transition-all">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#ededed] text-sm truncate">{upsell.name}</p>
                                <p className="text-[#a1a1aa] text-xs">{upsell.duration} min</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="font-bold text-[#ededed] text-sm">{formatCurrency(upsell.price)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveUpsell(upsell.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 w-7 p-0 rounded-full transition-all hover:scale-110"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sugestões de Complementos */}
                    {(() => {
                      const upsellOptions = selectedServiceId ? getUpsellOptions(selectedServiceId) : []
                      return upsellOptions.length > 0 && (
                        <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-xl p-3 shadow-lg">
                          <h4 className="font-semibold text-[#ededed] mb-2 flex items-center gap-2 text-xs uppercase tracking-wide">
                            <Lightbulb className="h-4 w-4 text-tymer-icon" /> Que tal adicionar?
                          </h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {upsellOptions.map((upsellService) => (
                              <div
                                key={upsellService.id}
                                className="flex items-center justify-between p-2 bg-[#27272a]/60 rounded-lg border border-[#3f3f46]/50 hover:border-tymer-primary/40 transition-all cursor-pointer group hover:bg-[#3f3f46]/50"
                                onClick={() => handleAddUpsell(upsellService)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-[#ededed] group-hover:text-tymer-primary transition-colors text-sm truncate">
                                    {upsellService.name}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-[#a1a1aa] group-hover:text-tymer-primary/80">{upsellService.duration} min</span>
                                    <span className="font-bold text-[#ededed] group-hover:text-tymer-primary">{formatCurrency(upsellService.price)}</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#3f3f46]/60 text-tymer-icon hover:bg-tymer-primary/20 hover:border-tymer-primary h-8 w-8 p-0 rounded-full group-hover:scale-110 transition-all shadow-lg flex-shrink-0 ml-2"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Footer fixo */}
                  <div className="flex-shrink-0 pt-3 border-t border-[#27272a]/50">
                    {/* Resumo Total */}
                    <div className="bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 border-2 border-tymer-primary/40 rounded-xl p-3 mb-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg text-[#ededed] flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-tymer-icon" /> Total:
                        </h4>
                        <div className="text-right">
                          <div className="font-bold text-2xl text-[#ededed] leading-tight">
                            <span className={(isCoveredBySubscription || availableCredits > 0) ? "text-emerald-400" : undefined}>
                              {formatCurrency(getEffectiveTotalPrice())}
                            </span>
                          </div>
                          <div className="text-[#a1a1aa] text-xs font-medium">
                            {calculateTotals().totalDuration} minutos
                          </div>
                        </div>
                      </div>
                      {availableCredits > 0 && (
                        <div className="mt-2 text-xs text-emerald-300">
                          Crédito disponível será utilizado neste agendamento {creditExpiresAt ? `(vence em ${formatBrazilDate(new Date(creditExpiresAt))})` : ''}
                        </div>
                      )}
                      {isCoveredBySubscription && (
                        <div className="mt-2 text-xs text-emerald-300">
                          Assinatura ativa: você não paga nada neste agendamento
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowUpsellModal(false)}
                        className="flex-1 border-[#3f3f46] text-[#a1a1aa] hover:text-[#ededed] hover:border-[#52525b] bg-transparent transition-all text-sm"
                      >
                        Continuar editando
                      </Button>
                      <Button
                        onClick={() => {
                          setShowUpsellModal(false)
                          setStep(2)
                        }}
                        className="flex-1 bg-tymer-primary hover:bg-tymer-primary/80 text-white font-bold transition-all shadow-lg hover:shadow-tymer-primary/25 transform hover:scale-[1.02] text-sm"
                      >
                        Avançar →
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Etapa 2: Seleção de Profissional */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="text-[#71717a] hover:text-[#ededed]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Escolha o profissional
                  </h3>
                  
                  {professionals.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#71717a]">Nenhum profissional disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {professionals.map((professional) => (
                        <div key={professional.id}>
                          <div
                            onClick={() => setSelectedProfessional(professional)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-tymer-primary
                              ${selectedProfessional?.id === professional.id 
                                ? 'border-tymer-primary bg-tymer-primary/10' 
                                : 'border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a]'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#27272a] flex-shrink-0">
                                {professional.avatar ? (
                                  <img 
                                    src={professional.avatar} 
                                    alt={professional.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 flex items-center justify-center">
                                    <span className="text-[#71717a] font-bold text-lg">
                                      {professional.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-[#ededed]">
                                  {professional.name}
                                </h4>
                                {professional.specialty && (
                                  <p className="text-sm text-[#a1a1aa]">
                                    {professional.specialty}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Botão contextual aparece logo após o profissional selecionado */}
                          {selectedProfessional?.id === professional.id && (
                            <div className="mt-3">
                              <div className="bg-tymer-primary/10 border border-tymer-primary/30 rounded-lg p-3 mb-3">
                                <p className="text-[#ededed] text-sm text-center flex items-center justify-center gap-2">
                                  <Check className="h-4 w-4 text-tymer-icon" />
                                  <span>Profissional selecionado:</span> <span className="font-semibold">{professional.name}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => setStep(3)}
                                className="w-full bg-tymer-primary hover:bg-tymer-primary/80"
                              >
                                Avançar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Etapa 3: Seleção de Data */}
              {step === 3 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(2)}
                      className="text-[#71717a] hover:text-[#ededed]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Escolha a data
                  </h3>
                  
                  {/* Seletor de data simples */}
                  <div className="space-y-3">
                    {Array.from({ length: 30 }, (_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() + i)
                      const dateString = toBrazilDateString(date)
                      const dayOfWeek = getBrazilDayNumber(date)
                      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                      const dayName = dayNames[dayOfWeek]
                      
                      // Verificar disponibilidade baseada no profissional selecionado
                      const dayStatus = dayAvailability[dateString]
                      const isLoading = dayStatus?.loading ?? false
                      
                      // Lógica melhorada de disponibilidade
                      let isAvailable = true
                      let statusText = 'Disponível'
                      
                      if (selectedProfessional && selectedProfessional.id !== 'any') {
                        if (dayStatus) {
                          // Tem dados no cache
                          isAvailable = dayStatus.available
                          statusText = isLoading 
                            ? 'Verificando...' 
                            : dayStatus.available 
                              ? 'Disponível' 
                              : (dayStatus.reason || 'Profissional não trabalha neste dia')
                        } else {
                          // Não tem cache ainda - verificar sob demanda
                          isAvailable = true // Assumir disponível até verificar
                          statusText = 'Verificando...'
                          // Disparar verificação imediatamente
                          checkDayAvailability(dateString, selectedProfessional.id)
                        }
                      }
                      
                      return (
                        <div key={dateString}>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Só permitir seleção se não estiver loading e estiver disponível
                              if (!isLoading && isAvailable) {
                                setSelectedDate(dateString)
                              }
                            }}
                            disabled={!isAvailable || isLoading}
                            className={`w-full p-4 h-auto flex items-center justify-between transition-all duration-200
                              ${selectedDate === dateString 
                                ? 'border-tymer-primary bg-tymer-primary/10' 
                                : isAvailable 
                                  ? 'border-[#27272a] bg-[#27272a]/50 hover:border-tymer-primary hover:bg-tymer-primary/10' 
                                  : 'bg-red-600/20 border-red-600/50 cursor-not-allowed text-red-300'
                              } ${isLoading ? 'opacity-60' : ''}`}
                          >
                            <div className="text-left">
                              <div className={`font-medium ${
                                isAvailable && !isLoading ? 'text-[#ededed]' : 'text-red-200'
                              }`}>
                                {dayName}, {formatBrazilDate(date)}
                              </div>
                              <div className={`text-sm ${
                                isAvailable && !isLoading ? 'text-[#a1a1aa]' : 'text-red-300'
                              }`}>
                                {statusText}
                              </div>
                            </div>
                            <Calendar className={`h-5 w-5 ${
                              isAvailable && !isLoading ? 'text-[#71717a]' : 'text-red-300'
                            } ${isLoading ? 'animate-pulse' : ''}`} />
                          </Button>
                          
                          {/* Botão contextual aparece logo após a data selecionada */}
                          {selectedDate === dateString && (
                            <div className="mt-3">
                              <div className="bg-tymer-primary/10 border border-tymer-primary/30 rounded-lg p-3 mb-3">
                                <p className="text-[#ededed] text-sm text-center flex items-center justify-center gap-2">
                                  <Check className="h-4 w-4 text-tymer-icon" />
                                  <span>Data selecionada:</span> <span className="font-semibold">{dayName}, {formatBrazilDate(date)}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => setStep(4)}
                                className="w-full bg-tymer-primary hover:bg-tymer-primary/80"
                              >
                                Avançar
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Etapa 4: Seleção de Horário */}
              {step === 4 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(3)}
                      className="text-[#71717a] hover:text-[#ededed]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Escolha o horário
                    {availableSlots.length === 0 && selectedDate && selectedServiceId && selectedProfessional && (
                      <Loader2 className="inline h-4 w-4 animate-spin ml-2" />
                    )}
                  </h3>
                  
                  {selectedDate ? (
                    (() => {
                      // Usar o estado availableSlots ao invés de chamar a função
                      const groupedSlots = groupSlotsByPeriod(availableSlots)
                      
                      if (availableSlots.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-[#71717a]" />
                            <p className="text-[#71717a]">Nenhum horário disponível para esta data</p>
                            {(!selectedProfessional || selectedServiceId === null) && (
                              <p className="text-[#71717a] text-sm mt-2">
                                Selecione um serviço e profissional primeiro
                              </p>
                            )}
                          </div>
                        )
                      }
                      
                      // Calcular estado inteligente das seções
                      const intelligentExpandedState = calculateInitialExpandedState(groupedSlots)
                      
                      // Usar estado inteligente diretamente (sem depender do state)
                      const currentExpandedState = {
                        morning: expandedPeriods.morning !== undefined ? expandedPeriods.morning : intelligentExpandedState.morning,
                        afternoon: expandedPeriods.afternoon !== undefined ? expandedPeriods.afternoon : intelligentExpandedState.afternoon,
                        night: expandedPeriods.night !== undefined ? expandedPeriods.night : intelligentExpandedState.night
                      }
                      
                      return (
                        <div className="space-y-4">
                          {/* Manhã */}
                          {groupedSlots.morning.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                onClick={() => setExpandedPeriods(prev => ({...prev, morning: !prev.morning}))}
                                className={`w-full justify-between p-4 h-auto rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                                  currentExpandedState.morning 
                                    ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-2 border-orange-400/50 shadow-lg shadow-orange-500/20' 
                                    : 'bg-gradient-to-r from-[#27272a] to-[#3f3f46] border border-[#27272a] hover:border-orange-400/30 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    currentExpandedState.morning 
                                      ? 'bg-gradient-to-r from-orange-400 to-yellow-400 shadow-lg' 
                                      : 'bg-[#3f3f46] border border-[#52525b]'
                                  }`}>
                                    <span className="text-xl">🌅</span>
                                  </div>
                                  <div className="text-left">
                                    <span className={`font-semibold text-base ${
                                      currentExpandedState.morning ? 'text-orange-100' : 'text-[#ededed]'
                                    }`}>
                                      Manhã
                                    </span>
                                    <p className={`text-sm ${
                                      currentExpandedState.morning ? 'text-orange-200' : 'text-[#a1a1aa]'
                                    }`}>
                                      Horários disponíveis
                                    </p>
                                  </div>
                                </div>
                                <div className={`transition-transform duration-300 ${
                                  currentExpandedState.morning ? 'rotate-180' : ''
                                }`}>
                                  <ChevronDown className={`h-5 w-5 ${
                                    currentExpandedState.morning ? 'text-orange-200' : 'text-[#71717a]'
                                  }`} />
                                </div>
                              </Button>
                              
                              {currentExpandedState.morning && (
                                <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    {groupedSlots.morning.map((slot, index) => (
                                      <div key={slot.time} className="contents">
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            if (slot.available) {
                                              setSelectedTime(slot.time)
                                            }
                                          }}
                                          disabled={!slot.available}
                                          className={`flex flex-col h-auto py-2 px-1 text-xs
                                            ${!slot.available
                                              ? 'bg-orange-600/20 border-orange-600 text-orange-300 cursor-not-allowed'
                                              : 'border-[#27272a] text-[#ededed] hover:border-tymer-primary hover:bg-tymer-primary/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-tymer-primary/25 ring-2 ring-white border-tymer-primary' 
                                              : ''
                                            }
                                          `}
                                        >
                                          <span>{slot.time}</span>
                                          {!slot.available && <span className="text-[10px] mt-1">Indisponível</span>}
                                        </Button>
                                        
                                        {/* Botão contextual aparece logo após o horário selecionado */}
                                        {selectedTime === slot.time && getSelectedTimePeriod(selectedTime) === 'morning' && (
                                          <div className="col-span-3 mt-2">
                                            <div className="bg-tymer-primary/10 border border-tymer-primary/30 rounded-lg p-3 mb-3">
                                              <p className="text-[#ededed] text-sm text-center flex items-center justify-center gap-2">
                                                <Check className="h-4 w-4 text-tymer-icon" />
                                                <span>Horário selecionado:</span> <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-tymer-primary hover:bg-tymer-primary/80"
                                            >
                                              Avançar para próxima etapa
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tarde */}
                          {groupedSlots.afternoon.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                onClick={() => setExpandedPeriods(prev => ({...prev, afternoon: !prev.afternoon}))}
                                className={`w-full justify-between p-4 h-auto rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                                  currentExpandedState.afternoon 
                                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/50 shadow-lg shadow-blue-500/20' 
                                    : 'bg-gradient-to-r from-[#27272a] to-[#3f3f46] border border-[#27272a] hover:border-blue-400/30 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    currentExpandedState.afternoon 
                                      ? 'bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg' 
                                      : 'bg-[#3f3f46] border border-[#52525b]'
                                  }`}>
                                    <span className="text-xl">☀️</span>
                                  </div>
                                  <div className="text-left">
                                    <span className={`font-semibold text-base ${
                                      currentExpandedState.afternoon ? 'text-blue-100' : 'text-[#ededed]'
                                    }`}>
                                      Tarde
                                    </span>
                                    <p className={`text-sm ${
                                      currentExpandedState.afternoon ? 'text-blue-200' : 'text-[#a1a1aa]'
                                    }`}>
                                      Horários disponíveis
                                    </p>
                                  </div>
                                </div>
                                <div className={`transition-transform duration-300 ${
                                  currentExpandedState.afternoon ? 'rotate-180' : ''
                                }`}>
                                  <ChevronDown className={`h-5 w-5 ${
                                    currentExpandedState.afternoon ? 'text-blue-200' : 'text-[#71717a]'
                                  }`} />
                                </div>
                              </Button>
                              
                              {currentExpandedState.afternoon && (
                                <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    {groupedSlots.afternoon.map((slot, index) => (
                                      <div key={slot.time} className="contents">
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            if (slot.available) {
                                              setSelectedTime(slot.time)
                                            }
                                          }}
                                          disabled={!slot.available}
                                          className={`flex flex-col h-auto py-2 px-1 text-xs
                                            ${!slot.available
                                              ? 'bg-orange-600/20 border-orange-600 text-orange-300 cursor-not-allowed'
                                              : 'border-[#27272a] text-[#ededed] hover:border-tymer-primary hover:bg-tymer-primary/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-tymer-primary/25 ring-2 ring-white border-tymer-primary' 
                                              : ''
                                            }
                                          `}
                                        >
                                          <span>{slot.time}</span>
                                          {!slot.available && <span className="text-[10px] mt-1">Indisponível</span>}
                                        </Button>
                                        
                                        {/* Botão contextual aparece logo após o horário selecionado */}
                                        {selectedTime === slot.time && getSelectedTimePeriod(selectedTime) === 'afternoon' && (
                                          <div className="col-span-3 mt-2">
                                            <div className="bg-tymer-primary/10 border border-tymer-primary/30 rounded-lg p-3 mb-3">
                                              <p className="text-[#ededed] text-sm text-center flex items-center justify-center gap-2">
                                                <Check className="h-4 w-4 text-tymer-icon" />
                                                <span>Horário selecionado:</span> <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-tymer-primary hover:bg-tymer-primary/80"
                                            >
                                              Avançar para próxima etapa
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Noite */}
                          {groupedSlots.night.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                onClick={() => setExpandedPeriods(prev => ({...prev, night: !prev.night}))}
                                className={`w-full justify-between p-4 h-auto rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                                  currentExpandedState.night 
                                    ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-2 border-purple-400/50 shadow-lg shadow-purple-500/20' 
                                    : 'bg-gradient-to-r from-[#27272a] to-[#3f3f46] border border-[#27272a] hover:border-purple-400/30 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    currentExpandedState.night 
                                      ? 'bg-gradient-to-r from-purple-400 to-indigo-400 shadow-lg' 
                                      : 'bg-[#3f3f46] border border-[#52525b]'
                                  }`}>
                                    <span className="text-xl">🌙</span>
                                  </div>
                                  <div className="text-left">
                                    <span className={`font-semibold text-base ${
                                      currentExpandedState.night ? 'text-purple-100' : 'text-[#ededed]'
                                    }`}>
                                      Noite
                                    </span>
                                    <p className={`text-sm ${
                                      currentExpandedState.night ? 'text-purple-200' : 'text-[#a1a1aa]'
                                    }`}>
                                      Horários disponíveis
                                    </p>
                                  </div>
                                </div>
                                <div className={`transition-transform duration-300 ${
                                  currentExpandedState.night ? 'rotate-180' : ''
                                }`}>
                                  <ChevronDown className={`h-5 w-5 ${
                                    currentExpandedState.night ? 'text-purple-200' : 'text-[#71717a]'
                                  }`} />
                                </div>
                              </Button>
                              
                              {currentExpandedState.night && (
                                <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    {groupedSlots.night.map((slot, index) => (
                                      <div key={slot.time} className="contents">
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            if (slot.available) {
                                              setSelectedTime(slot.time)
                                            }
                                          }}
                                          disabled={!slot.available}
                                          className={`flex flex-col h-auto py-2 px-1 text-xs
                                            ${!slot.available
                                              ? 'bg-orange-600/20 border-orange-600 text-orange-300 cursor-not-allowed'
                                              : 'border-[#27272a] text-[#ededed] hover:border-tymer-primary hover:bg-tymer-primary/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-tymer-primary/25 ring-2 ring-white border-tymer-primary' 
                                              : ''
                                            }
                                          `}
                                        >
                                          <span>{slot.time}</span>
                                          {!slot.available && <span className="text-[10px] mt-1">Indisponível</span>}
                                        </Button>
                                        
                                        {/* Botão contextual aparece logo após o horário selecionado */}
                                        {selectedTime === slot.time && getSelectedTimePeriod(selectedTime) === 'night' && (
                                          <div className="col-span-3 mt-2">
                                            <div className="bg-tymer-primary/10 border border-tymer-primary/30 rounded-lg p-3 mb-3">
                                              <p className="text-[#ededed] text-sm text-center flex items-center justify-center gap-2">
                                                <Check className="h-4 w-4 text-tymer-icon" />
                                                <span>Horário selecionado:</span> <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-tymer-primary hover:bg-tymer-primary/80"
                                            >
                                              Avançar para próxima etapa
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#71717a]">Selecione uma data primeiro</p>
                    </div>
                  )}
                </div>
              )}

              {/* Etapa 5: Dados do Cliente - Formulário Inteligente */}
              {step === 5 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(4)}
                      className="text-[#71717a] hover:text-[#ededed]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Seus dados
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Telefone - primeiro campo sempre visível */}
                    <div>
                      <Label htmlFor="phone" className="text-[#ededed]">
                        Telefone *
                      </Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={formatPhoneNumber(customerData.phone)}
                          onChange={handlePhoneInputChange}
                          className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a]"
                        />
                        {searchingClient && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#71717a]" />
                          </div>
                        )}
                      </div>
                      
                      {/* Feedback da busca */}
                      {clientFound === true && (
                        <p className="text-sm text-emerald-400 mt-1">
                          ✓ Cliente encontrado! Dados preenchidos automaticamente.
                        </p>
                      )}
                      {clientFound === false && (
                        <div className="mt-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                          <p className="text-sm text-blue-300 font-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Novo cliente! Vamos conhecê-lo melhor
                          </p>
                          <p className="text-xs text-blue-200/80 mt-1">
                            Preencha seus dados abaixo para finalizar o agendamento
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Campos adicionais - aparecem após busca ou telefone válido */}
                    {showClientForm && (
                      <>
                        {/* Nome */}
                        <div>
                          <Label htmlFor="name" className="text-[#ededed]">
                            Nome completo *
                          </Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Seu nome completo"
                            value={customerData.name}
                            onChange={(e) => setCustomerData(prev => ({...prev, name: e.target.value}))}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a]"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <Label htmlFor="email" className="text-[#ededed]">
                            E-mail *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={customerData.email}
                            onChange={(e) => setCustomerData(prev => ({...prev, email: e.target.value}))}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a]"
                          />
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                          <Label htmlFor="birthDate" className="text-[#ededed]">
                            Data de nascimento
                          </Label>
                          <Input
                            id="birthDate"
                            type="date"
                            value={customerData.birthDate || ""}
                            onChange={(e) => setCustomerData(prev => ({...prev, birthDate: e.target.value}))}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a]"
                            max={toLocalDateString(new Date())} // 🇧🇷 CORREÇÃO: Não permitir datas futuras
                          />
                        </div>

                        {/* Observações */}
                        <div>
                          <Label htmlFor="notes" className="text-[#ededed]">
                            Observações (opcional)
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder="Alguma observação especial..."
                            value={customerData.notes || ""}
                            onChange={(e) => setCustomerData(prev => ({...prev, notes: e.target.value}))}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a] resize-none"
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    {/* Botão Avançar */}
                    <Button
                      onClick={() => setStep(6)}
                      disabled={!showClientForm || !customerData.name.trim() || !customerData.phone.trim() || !customerData.email.trim()}
                      className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white disabled:opacity-50"
                    >
                      Avançar
                    </Button>
                  </div>
                </div>
              )}

              {/* Etapa 6: Confirmação */}
              {step === 6 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(5)}
                      className="text-[#71717a] hover:text-[#ededed]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Confirmar agendamento
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Resumo do agendamento */}
                    <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-lg p-4 space-y-3 shadow-lg">
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Serviços:</span>
                        <div className="text-right">
                          {(() => {
                            const mainService = getMainService()
                            const allServices = mainService ? [mainService, ...addedUpsells] : []
                            return allServices.map((service, index) => (
                              <div key={service.id} className="text-[#ededed] font-medium">
                                {service.name}
                                {index < allServices.length - 1 && ', '}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Profissional:</span>
                        <span className="text-[#ededed] font-medium">
                          {selectedProfessional?.name || "Qualquer profissional"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Data:</span>
                        <span className="text-[#ededed] font-medium">
                          {selectedDate || "Data selecionada (demo)"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Horário:</span>
                        <span className="text-[#ededed] font-medium">{selectedTime}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Duração Total:</span>
                        <span className="text-[#ededed] font-medium">{calculateTotals().totalDuration}min</span>
                      </div>
                      
                      <div className="flex justify-between items-start gap-3 border-t border-[#3f3f46] pt-3">
                        <span className="text-[#a1a1aa] mt-1">Valor Total:</span>
                        <div className="text-right">
                          <div className="text-[#ededed] font-bold text-lg flex items-center gap-2 justify-end">
                            <span className={(isCoveredBySubscription || availableCredits > 0) ? "text-emerald-400" : undefined}>
                              {formatCurrency(getEffectiveTotalPrice())}
                            </span>
                            {isCoveredBySubscription && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Coberto pela assinatura
                              </span>
                            )}
                          </div>
                          {/* Mostrar bloco de crédito apenas quando NÃO há cobertura por assinatura */}
                          {!isCoveredBySubscription && availableCredits > 0 && (
                            <div className="text-xs text-emerald-300 mt-1 space-y-1 text-right">
                              <div>Crédito disponível será utilizado</div>
                              <div className="text-[11px] text-emerald-400/90">
                                Consumirá: <strong>1 crédito</strong> • Restantes após este agendamento: <strong>{Math.max(availableCredits - 1, 0)}</strong>
                              </div>
                              {creditExpiresAt && (
                                <div className="text-[11px] text-emerald-400/60">
                                  Validade do pacote: {new Date(creditExpiresAt).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Aviso complementar quando assinatura cobre */}
                          {isCoveredBySubscription && (
                            <div className="text-xs text-emerald-300 mt-1 text-right">
                              Nenhum pagamento agora — sua assinatura cobre este agendamento
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dados do cliente */}
                    <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-lg p-4 space-y-2 shadow-lg">
                      <h4 className="font-medium text-[#ededed] mb-2">Seus dados:</h4>
                      <p className="text-sm text-[#a1a1aa]">
                        <strong className="text-[#ededed]">Nome:</strong> {customerData.name}
                      </p>
                      <p className="text-sm text-[#a1a1aa]">
                        <strong className="text-[#ededed]">Telefone:</strong> {customerData.phone}
                      </p>
                      <p className="text-sm text-[#a1a1aa]">
                        <strong className="text-[#ededed]">E-mail:</strong> {customerData.email}
                      </p>
                      {customerData.birthDate && (
                        <p className="text-sm text-[#a1a1aa]">
                          <strong className="text-[#ededed]">Data de nascimento:</strong> {formatBrazilDateOnly(customerData.birthDate)}
                        </p>
                      )}
                      {customerData.notes && (
                        <p className="text-sm text-[#a1a1aa]">
                          <strong className="text-[#ededed]">Observações:</strong> {customerData.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleCreateAppointment}
                      disabled={isSubmitting}
                      className="w-full bg-tymer-primary hover:bg-tymer-primary/80 disabled:opacity-50 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Agendando...
                        </>
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Etapa 7: Página de Sucesso */}
              {step === 7 && (
                <div className="text-center py-8">
                  {/* Animação de sucesso (emerald mantido) */}
                  <div className="relative animate-bounce-in">
                    <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full animate-ping opacity-75"></div>
                  </div>

                  <h2 className="text-2xl font-bold mb-3 text-[#ededed] animate-fade-in animate-delay-200 flex items-center justify-center gap-2">
                    <PartyPopper className="h-6 w-6 text-tymer-icon" />
                    Agendamento Confirmado!
                  </h2>

                  <p className="text-[#a1a1aa] mb-6 text-lg animate-fade-in animate-delay-400">
                    Seu agendamento foi realizado com <span className="font-semibold text-emerald-500">sucesso</span>!<br />
                    Você receberá uma confirmação via WhatsApp em breve.
                  </p>

                  {/* Card com detalhes do agendamento */}
                  <div className="bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 border border-tymer-primary/30 rounded-xl p-6 mb-6 text-left animate-slide-up animate-delay-600">
                    <h3 className="text-lg font-semibold text-[#ededed] mb-4 text-center flex items-center justify-center gap-2">
                      <Calendar className="h-5 w-5 text-tymer-icon" />
                      Detalhes do Agendamento
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <div className="flex items-center gap-2 text-[#a1a1aa] font-medium">
                          <Calendar className="h-4 w-4 text-tymer-icon" />
                          <span>Data e horário:</span>
                        </div>
                        <span className="text-[#ededed] font-bold">
                          {formatBrazilDate(parseDate(selectedDate))} às {selectedTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <div className="flex items-center gap-2 text-[#a1a1aa] font-medium">
                          <Scissors className="h-4 w-4 text-tymer-icon" />
                          <span>Serviços:</span>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const mainService = getMainService()
                            const allServices = mainService ? [mainService, ...addedUpsells] : []
                            return allServices.map((service, index) => (
                              <div key={service.id} className="text-[#ededed] font-bold">
                                {service.name}
                                {index < allServices.length - 1 && <br />}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <div className="flex items-center gap-2 text-[#a1a1aa] font-medium">
                          <User className="h-4 w-4 text-tymer-icon" />
                          <span>Profissional:</span>
                        </div>
                        <span className="text-[#ededed] font-bold">
                          {selectedProfessional?.name || "Qualquer profissional"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <div className="flex items-center gap-2 text-[#a1a1aa] font-medium">
                          <Clock className="h-4 w-4 text-tymer-icon" />
                          <span>Duração Total:</span>
                        </div>
                        <span className="text-[#ededed] font-bold">{calculateTotals().totalDuration} minutos</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-tymer-primary/20 border border-tymer-primary/40 rounded-lg">
                        <div className="flex items-center gap-2 text-[#ededed] font-bold">
                          <Wallet className="h-4 w-4 text-tymer-icon" />
                          <span>Valor Total:</span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[#ededed] font-bold text-xl">
                              <span className={(isCoveredBySubscription || availableCredits > 0) ? "text-emerald-400" : undefined}>
                                {formatCurrency(getEffectiveTotalPrice())}
                              </span>
                            </span>
                            {isCoveredBySubscription && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Coberto pela assinatura
                              </span>
                            )}
                          </div>
                          {/* Mostrar aviso de crédito apenas quando NÃO há assinatura */}
                          {!isCoveredBySubscription && availableCredits > 0 && (
                            <div className="text-xs text-emerald-300 mt-1">Crédito utilizado neste agendamento</div>
                          )}
                          {isCoveredBySubscription && (
                            <div className="text-xs text-emerald-300 mt-1">Nenhum pagamento agora — sua assinatura cobre este agendamento</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações importantes */}
                  <div className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-lg p-4 space-y-3 shadow-lg mb-6 animate-slide-up animate-delay-600">
                    <h4 className="text-white font-semibold mb-2 flex items-center justify-center gap-2">
                      <Info className="h-4 w-4 text-tymer-icon" />
                      Informações Importantes
                    </h4>
                    <div className="text-sm text-[#ededed] space-y-1 text-left">
                      <p>• Você receberá lembretes antes do agendamento</p>
                      <p>• Em caso de cancelamento, avise com antecedência</p>
                      <p>• Chegue com 10 minutos de antecedência</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-3 animate-fade-in animate-delay-600">
                    <Button
                      onClick={() => {
                        // Reset completo do formulário
                        setStep(1)
                        setSelectedServiceId(null)
                        setAddedUpsells([])
                        setSelectedProfessional(null)
                        setSelectedDate("")
                        setSelectedTime("")
                        setCustomerData({name: "", phone: "", email: "", notes: ""})
                        setSearchingClient(false)
                        setClientFound(null)
                        setShowClientForm(false)
                        if (phoneDebounceTimer) {
                          clearTimeout(phoneDebounceTimer)
                          setPhoneDebounceTimer(null)
                        }
                      }}
                      className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white font-semibold py-3 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Target className="h-5 w-5 text-tymer-icon" />
                      Fazer Novo Agendamento
                    </Button>

                    <Button
                      onClick={() => {
                        // Compartilhar no WhatsApp
                        const mainService = getMainService()
                        const allServices = mainService ? [mainService, ...addedUpsells] : []
                        const servicesText = allServices.map(s => s.name).join(', ')
                        const message = `🎉 Agendamento confirmado!\n\n📅 Data: ${formatBrazilDate(parseDate(selectedDate))}\n⏰ Horário: ${selectedTime}\n✂️ Serviços: ${servicesText}\n👨‍💼 Profissional: ${selectedProfessional?.name || "Qualquer profissional"}\n💰 Valor Total: ${formatCurrency(getEffectiveTotalPrice())}`
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                        window.open(whatsappUrl, '_blank')
                      }}
                      variant="outline"
                      className="w-full border-tymer-primary text-white hover:bg-tymer-primary/10 font-semibold py-3 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Smartphone className="h-5 w-5 text-tymer-icon" />
                      Compartilhar no WhatsApp
                    </Button>
                  </div>
                </div>
              )}
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
