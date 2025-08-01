"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import InputMask from "react-input-mask"
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
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Phone,
  Star,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  utcToBrazil, 
  parseDateTime, 
  formatBrazilTime, 
  formatBrazilDate,
  getBrazilDayOfWeek,
  getBrazilNow,
  toBrazilDateString,
  debugTimezone,
  parseDate
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
}

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

interface WorkingHours {
  dayOfWeek: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface CustomerData {
  name: string
  phone: string
  email: string
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
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  
  // Estados do formulário
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    notes: ""
  })
  
  // Estados de UI
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
  
  // Estados para verificação de disponibilidade
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Estados para formulário inteligente de cliente
  const [searchingClient, setSearchingClient] = useState(false)
  const [clientFound, setClientFound] = useState<boolean | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [phoneDebounceTimer, setPhoneDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Estado para controlar visibilidade dos detalhes do estabelecimento
  const [isDetailsVisible, setIsDetailsVisible] = useState(false)

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

      // Carregar dados em paralelo
      const [servicesRes, professionalsRes, workingHoursRes] = await Promise.all([
        fetch(`/api/public/business/${params.slug}/services`),
        fetch(`/api/public/business/${params.slug}/professionals`),
        fetch(`/api/public/business/${params.slug}/working-hours`)
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

      if (workingHoursRes.ok) {
        const workingHoursData = await workingHoursRes.json()
        setWorkingHours(workingHoursData)
      }

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados do estabelecimento')
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar horários ocupados
  const loadAvailability = async (date: string, professionalId?: string) => {
    if (!date) return
    
    try {
      setLoadingAvailability(true)
      const url = new URL(`/api/public/business/${params.slug}/availability`, window.location.origin)
      url.searchParams.set('date', date)
      if (professionalId) {
        url.searchParams.set('professionalId', professionalId)
      }
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setOccupiedSlots(data.occupiedSlots || [])
      } else {
        console.error('Erro ao buscar disponibilidade:', response.statusText)
        setOccupiedSlots([])
      }
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error)
      setOccupiedSlots([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Função para verificar se um horário está disponível (considerando duração do serviço)
  const isTimeSlotAvailable = (time: string) => {
    if (!selectedService) return false
    
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const slotStartMinutes = timeToMinutes(time)
    const slotEndMinutes = slotStartMinutes + (selectedService.duration || 30)
    
    // 🕒 Verificar se o horário já passou (apenas para hoje)
    if (selectedDate) {
      const selectedDateParsed = parseDate(selectedDate)
      const now = getBrazilNow()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const selectedDateOnly = new Date(selectedDateParsed.getFullYear(), selectedDateParsed.getMonth(), selectedDateParsed.getDate())
      
      // Se é hoje, verificar se o horário já passou
      if (selectedDateOnly.getTime() === today.getTime()) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        if (slotStartMinutes <= nowMinutes) {
          return false // Horário já passou
        }
      }
    }
    
    // Verificar se há conflito com algum agendamento existente
    if (selectedProfessional === null) {
      // "Qualquer profissional": verificar se TODOS os profissionais estão ocupados
      // Se pelo menos um profissional estiver livre, o horário está disponível
      const allProfessionalsOccupied = professionals.every(prof => 
        occupiedSlots.some(slot => {
          if (slot.professionalId !== prof.id) return false
          
          const aptStartMinutes = timeToMinutes(slot.startTime)
          const aptEndMinutes = aptStartMinutes + (slot.duration || 30)
          
          return (
            (slotStartMinutes >= aptStartMinutes && slotStartMinutes < aptEndMinutes) || // Início conflita
            (slotEndMinutes > aptStartMinutes && slotEndMinutes <= aptEndMinutes) ||     // Fim conflita
            (slotStartMinutes <= aptStartMinutes && slotEndMinutes >= aptEndMinutes)     // Engloba
          )
        })
      )
      return !allProfessionalsOccupied
    } else if (selectedProfessional) {
      // Profissional específico: verificar apenas conflitos com este profissional
      return !occupiedSlots.some(slot => {
        if (slot.professionalId !== selectedProfessional.id) return false
        
        const aptStartMinutes = timeToMinutes(slot.startTime)
        const aptEndMinutes = aptStartMinutes + (slot.duration || 30)
        
        return (
          (slotStartMinutes >= aptStartMinutes && slotStartMinutes < aptEndMinutes) || // Início conflita
          (slotEndMinutes > aptStartMinutes && slotEndMinutes <= aptEndMinutes) ||     // Fim conflita
          (slotStartMinutes <= aptStartMinutes && slotEndMinutes >= aptEndMinutes)     // Engloba
        )
      })
    } else {
      // selectedProfessional === undefined (não selecionado): não mostrar disponibilidade
      return false
    }
  }

  // Carregar disponibilidade quando data ou profissional mudarem
  useEffect(() => {
    if (selectedDate) {
      loadAvailability(selectedDate, selectedProfessional?.id)
    }
  }, [selectedDate, selectedProfessional?.id, params.slug])

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

  // Gerar horários disponíveis baseados nos horários de funcionamento
  const generateAvailableSlots = (date: string) => {
    if (!selectedService || workingHours.length === 0) return []

    // Converter data para timezone brasileiro
    const selectedDateBrazil = parseDate(date)
    const dayOfWeek = getBrazilDayOfWeek(selectedDateBrazil)
    
    // Mapear dias da semana
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    
    // Encontrar horário de funcionamento para o dia
    const daySchedule = workingHours.find(wh => wh.dayOfWeek === dayName && wh.isActive)
    
    if (!daySchedule) return []

    const slots = []
    const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number)
    const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number)
    
    // Gerar slots de 5 em 5 minutos
    let currentTime = startHour * 60 + startMinute // em minutos
    const endTime = endHour * 60 + endMinute
    const serviceDuration = selectedService.duration || 30
    
    while (currentTime + serviceDuration <= endTime) {
      const hour = Math.floor(currentTime / 60)
      const minute = currentTime % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      // Verificar se o horário está disponível (considerando duração do serviço)
      const isAvailable = isTimeSlotAvailable(timeString)
      
      slots.push({
        time: timeString,
        available: isAvailable,
        occupied: !isAvailable,
        period: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night'
      })
      
      currentTime += 5 // incrementar 5 minutos
    }
    
    return slots
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

    setSearchingClient(true)
    setClientFound(null)

    try {
      const response = await fetch(`/api/public/clients/search?phone=${phone}&businessSlug=${params.slug}`)
      
      if (response.ok) {
        const clientData = await response.json()
        
        // Cliente encontrado
        setCustomerData(prev => ({
          ...prev,
          name: clientData.name || "",
          email: clientData.email || "",
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
          notes: ""
        }))
        
        setClientFound(false)
        setShowClientForm(true)
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      setClientFound(false)
      setShowClientForm(true)
    } finally {
      setSearchingClient(false)
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

  // Limpar timer ao desmontar componente
  useEffect(() => {
    return () => {
      if (phoneDebounceTimer) {
        clearTimeout(phoneDebounceTimer)
      }
    }
  }, [phoneDebounceTimer])

  // Validar formulário
  const validateAppointmentData = () => {
    const errors = []

    // Validar serviço
    if (!selectedService) {
      errors.push("Selecione um serviço")
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
    console.log('🚀 [DEBUG] Iniciando handleCreateAppointment')
    
    // Validar dados
    const validationErrors = validateAppointmentData()
    console.log('📝 [DEBUG] Validação:', validationErrors)
    
    if (validationErrors.length > 0) {
      console.log('❌ [DEBUG] Validação falhou, parando execução')
      toast({
        title: "Dados inválidos",
        description: validationErrors.join(", "),
        variant: "destructive"
      })
      return
    }

    console.log('⚡ [DEBUG] isSubmitting estado atual:', isSubmitting)
    
    // Verificar se já não está processando (evitar múltiplos submits)
    if (isSubmitting) {
      console.log('⚠️ [DEBUG] Já está processando, parando execução')
      return
    }

    console.log('✅ [DEBUG] Iniciando processo de criação do agendamento')
    setIsSubmitting(true)
    
    try {
      console.log('🔄 [DEBUG] Criando dateTime...')
      // 🇧🇷 Criar dateTime usando timezone brasileiro e converter para UTC
      const appointmentDateTime = parseDateTime(selectedDate, selectedTime)
      debugTimezone(appointmentDateTime, 'Frontend Público - Criando agendamento')

      // Sanitizar dados de entrada
      const sanitizedData = {
        businessSlug: params.slug as string,
        clientName: sanitizeInput(customerData.name),
        clientPhone: sanitizeInput(customerData.phone),
        clientEmail: sanitizeInput(customerData.email),
        professionalId: selectedProfessional?.id || null,
        serviceId: selectedService!.id,
        appointmentDateTime: appointmentDateTime.toISOString(), // Envia em UTC para o backend
        notes: customerData.notes ? sanitizeInput(customerData.notes) : null
      }

      console.log('🚀 [DEBUG] Dados sanitizados:', sanitizedData)
      console.log('📡 [DEBUG] Fazendo chamada para API...')

      const response = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedData)
      })

      console.log('📨 [DEBUG] Resposta da API recebida - Status:', response.status)
      
      const result = await response.json()
      console.log('📄 [DEBUG] Resultado da API:', result)

      if (!response.ok) {
        console.log('❌ [DEBUG] API retornou erro, indo para catch')
        throw new Error(result.message || 'Erro ao criar agendamento')
      }

      console.log('✅ [DEBUG] Agendamento criado com sucesso:', result)

      toast({
        title: "✅ Sucesso!",
        description: "Agendamento criado com sucesso!",
      })

      console.log('🎯 [DEBUG] Navegando para etapa 7...')
      // Navegar para a etapa de sucesso
      setStep(7)
      console.log('🎯 [DEBUG] setStep(7) executado!')

    } catch (error: any) {
      console.error('❌ [DEBUG] Erro capturado no catch:', error)
      
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      console.log('🔄 [DEBUG] Executando finally - setIsSubmitting(false)')
      setIsSubmitting(false)
    }
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-[#27272a]">
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
              
              {/* Modal de Detalhes */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="mx-auto border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10 transition-all duration-300"
                  >
                    Ver Detalhes
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-[425px] bg-[#18181b] border-[#27272a]">
                  <DialogHeader>
                    <DialogTitle className="text-[#ededed] text-center text-xl">
                      {businessData.businessName}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {/* Informações de Contato */}
                    {businessData.businessPhone && (
                      <div className="flex items-center gap-3 text-[#a1a1aa]">
                        <Phone className="h-5 w-5 text-emerald-500" />
                        <span>{businessData.businessPhone}</span>
                      </div>
                    )}
                    {businessData.businessAddress && (
                      <div className="flex items-center gap-3 text-[#a1a1aa]">
                        <MapPin className="h-5 w-5 text-emerald-500" />
                        <span>{businessData.businessAddress}</span>
                      </div>
                    )}
                    
                    {/* Separador */}
                    {(businessData.businessPhone || businessData.businessAddress) && 
                     (businessData.businessPhone || businessData.businessInstagram) && (
                      <div className="border-t border-[#27272a] my-2"></div>
                    )}

                    {/* Botões de Ação */}
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
                          className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
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
                          className="w-full border-[#27272a] text-[#ededed] hover:border-pink-500 hover:bg-pink-500/10 flex items-center justify-center gap-2"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Seguir no Instagram
                        </Button>
                      )}
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
                      ? 'bg-emerald-600 text-white' 
                      : step > stepNumber 
                        ? 'bg-emerald-600 text-white' 
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
              
              {/* Etapa 1: Seleção de Serviços */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#ededed]">
                    Escolha o serviço
                  </h3>
                  
                  {services.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#71717a]">Nenhum serviço disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service) => (
                        <div key={service.id}>
                          <div
                            onClick={() => setSelectedService(service)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-emerald-600
                              ${selectedService?.id === service.id 
                                ? 'border-emerald-600 bg-emerald-600/10' 
                                : 'border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a]'
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-[#ededed] mb-1">
                                  {service.name}
                                </h4>
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
                          
                          {/* Botão contextual aparece logo após o serviço selecionado */}
                          {selectedService?.id === service.id && (
                            <div className="mt-3">
                              <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                <p className="text-emerald-400 text-sm text-center">
                                  ✅ Serviço selecionado: <span className="font-semibold">{service.name}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => setStep(2)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                  
                  {/* Mostrar "Qualquer profissional" apenas se houver mais de um profissional */}
                  {professionals.length > 1 && (
                    <div>
                      <div
                        onClick={() => setSelectedProfessional(null)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all mb-3 hover:border-emerald-600
                          ${selectedProfessional === null 
                            ? 'border-emerald-600 bg-emerald-600/10' 
                            : 'border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a]'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#27272a] flex items-center justify-center">
                            <Users className="h-6 w-6 text-[#71717a]" />
                          </div>
                          <div>
                            <h4 className="font-medium text-[#ededed]">
                              Qualquer profissional
                            </h4>
                            <p className="text-sm text-[#a1a1aa]">
                              Próximo disponível
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botão contextual para "Qualquer profissional" */}
                      {selectedProfessional === null && (
                        <div className="mt-3 mb-6">
                          <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                            <p className="text-emerald-400 text-sm text-center">
                              ✅ Profissional selecionado: <span className="font-semibold">Qualquer profissional</span>
                            </p>
                          </div>
                          <Button
                            onClick={() => setStep(3)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                          >
                            Avançar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
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
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-emerald-600
                              ${selectedProfessional?.id === professional.id 
                                ? 'border-emerald-600 bg-emerald-600/10' 
                                : 'border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a]'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                {professional.avatar ? (
                                  <AvatarImage 
                                    src={professional.avatar} 
                                    alt={professional.name} 
                                  />
                                ) : (
                                  <AvatarFallback className="bg-[#27272a] text-[#71717a]">
                                    {professional.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
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
                              <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                <p className="text-emerald-400 text-sm text-center">
                                  ✅ Profissional selecionado: <span className="font-semibold">{professional.name}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => setStep(3)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                      const dayOfWeek = getBrazilDayOfWeek(date)
                      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                      const dayName = dayNames[dayOfWeek]
                      
                      // Verificar se o dia está disponível
                      const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                      const dayNameEn = dayNamesEn[dayOfWeek]
                      const isAvailable = workingHours.some(wh => wh.dayOfWeek === dayNameEn && wh.isActive)
                      
                      return (
                        <div key={dateString}>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (isAvailable) {
                                setSelectedDate(dateString)
                              }
                            }}
                            disabled={!isAvailable}
                            className={`w-full p-4 h-auto flex items-center justify-between
                              ${selectedDate === dateString 
                                ? 'border-emerald-600 bg-emerald-600/10' 
                                : isAvailable 
                                  ? 'border-[#27272a] bg-[#27272a]/50 hover:border-emerald-600 hover:bg-emerald-600/10' 
                                  : 'bg-red-600 opacity-60 cursor-not-allowed border-red-600'
                              }`}
                          >
                            <div className="text-left">
                              <div className={`font-medium ${isAvailable ? 'text-[#ededed]' : 'text-white'}`}>
                                {dayName}, {formatBrazilDate(date)}
                              </div>
                              <div className={`text-sm ${isAvailable ? 'text-[#a1a1aa]' : 'text-red-200'}`}>
                                {isAvailable ? 'Disponível' : 'Fechado'}
                              </div>
                            </div>
                            <Calendar className={`h-5 w-5 ${isAvailable ? 'text-[#71717a]' : 'text-red-200'}`} />
                          </Button>
                          
                          {/* Botão contextual aparece logo após a data selecionada */}
                          {selectedDate === dateString && (
                            <div className="mt-3">
                              <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                <p className="text-emerald-400 text-sm text-center">
                                  ✅ Data selecionada: <span className="font-semibold">{dayName}, {formatBrazilDate(date)}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => setStep(4)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                    {loadingAvailability && (
                      <Loader2 className="inline h-4 w-4 animate-spin ml-2" />
                    )}
                  </h3>
                  
                  {selectedDate ? (
                    (() => {
                      const availableSlots = generateAvailableSlots(selectedDate)
                      const groupedSlots = groupSlotsByPeriod(availableSlots)
                      
                      if (availableSlots.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-[#71717a]" />
                            <p className="text-[#71717a]">Nenhum horário disponível para esta data</p>
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
                                      {groupedSlots.morning.length} horários disponíveis
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
                                              : 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
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
                                            <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                              <p className="text-emerald-400 text-sm text-center">
                                                ✅ Horário selecionado: <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                                      {groupedSlots.afternoon.length} horários disponíveis
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
                                              : 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
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
                                            <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                              <p className="text-emerald-400 text-sm text-center">
                                                ✅ Horário selecionado: <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                                      {groupedSlots.night.length} horários disponíveis
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
                                              : 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10'
                                            }
                                            ${selectedTime === slot.time 
                                              ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
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
                                            <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mb-3">
                                              <p className="text-emerald-400 text-sm text-center">
                                                ✅ Horário selecionado: <span className="font-semibold">{selectedTime}</span>
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => setStep(5)}
                                              className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                        <InputMask
                          mask="(99) 99999-9999"
                          value={customerData.phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            // Remove tudo que não for dígito para manter estado limpo
                            const rawValue = e.target.value.replace(/\D/g, '')
                            handlePhoneChange(rawValue)
                          }}
                          id="phone"
                          name="phone"
                        >
                          {(inputProps: any) => (
                            <input
                              {...inputProps}
                              type="tel"
                              placeholder="(11) 99999-9999"
                              className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a] flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          )}
                        </InputMask>
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
                        <p className="text-sm text-[#a1a1aa] mt-1">
                          Cliente não encontrado. Preencha os dados abaixo.
                        </p>
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
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
                    <div className="bg-[#27272a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#a1a1aa]">Serviço:</span>
                        <span className="text-[#ededed] font-medium">{selectedService?.name}</span>
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
                        <span className="text-[#a1a1aa]">Duração:</span>
                        <span className="text-[#ededed] font-medium">{selectedService?.duration}min</span>
                      </div>
                      
                      <div className="flex justify-between border-t border-[#3f3f46] pt-3">
                        <span className="text-[#a1a1aa]">Valor:</span>
                        <span className="text-[#ededed] font-bold text-lg">
                          {formatCurrency(selectedService?.price)}
                        </span>
                      </div>
                    </div>

                    {/* Dados do cliente */}
                    <div className="bg-[#27272a] rounded-lg p-4 space-y-2">
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
                      {customerData.notes && (
                        <p className="text-sm text-[#a1a1aa]">
                          <strong className="text-[#ededed]">Observações:</strong> {customerData.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleCreateAppointment}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
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
                  {/* Animação de sucesso */}
                  <div className="relative animate-bounce-in">
                    <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-3 text-[#ededed] animate-fade-in animate-delay-200">
                    🎉 Agendamento Confirmado!
                  </h2>
                  
                  <p className="text-[#a1a1aa] mb-6 text-lg animate-fade-in animate-delay-400">
                    Seu agendamento foi realizado com <span className="text-emerald-400 font-semibold">sucesso</span>!<br />
                    Você receberá uma confirmação via WhatsApp em breve.
                  </p>
                  
                  {/* Card com detalhes do agendamento */}
                  <div className="bg-gradient-to-r from-emerald-600/10 to-emerald-700/10 border border-emerald-600/30 rounded-xl p-6 mb-6 text-left animate-slide-up animate-delay-600">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-4 text-center">
                      📅 Detalhes do Agendamento
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <span className="text-[#a1a1aa] font-medium">📅 Data e horário:</span>
                        <span className="text-[#ededed] font-bold">
                          {formatBrazilDate(parseDate(selectedDate))} às {selectedTime}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <span className="text-[#a1a1aa] font-medium">✂️ Serviço:</span>
                        <span className="text-[#ededed] font-bold">{selectedService?.name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <span className="text-[#a1a1aa] font-medium">👨‍💼 Profissional:</span>
                        <span className="text-[#ededed] font-bold">
                          {selectedProfessional?.name || "Qualquer profissional"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-[#27272a]/50 rounded-lg">
                        <span className="text-[#a1a1aa] font-medium">⏱️ Duração:</span>
                        <span className="text-[#ededed] font-bold">{selectedService?.duration} minutos</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-emerald-600/20 border border-emerald-600/40 rounded-lg">
                        <span className="text-emerald-300 font-bold">💰 Valor:</span>
                        <span className="text-emerald-300 font-bold text-xl">
                          {formatCurrency(selectedService?.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informações importantes */}
                  <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4 mb-6 animate-slide-up animate-delay-600">
                    <h4 className="text-blue-400 font-semibold mb-2 flex items-center justify-center gap-2">
                      ℹ️ Informações Importantes
                    </h4>
                    <div className="text-sm text-[#a1a1aa] space-y-1">
                      <p>• Você receberá um lembrete 24h antes do agendamento</p>
                      <p>• Em caso de cancelamento, avise com pelo menos 2h de antecedência</p>
                      <p>• Chegue com 5 minutos de antecedência</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-3 animate-fade-in animate-delay-600">
                    <Button
                      onClick={() => {
                        // Reset completo do formulário
                        setStep(1)
                        setSelectedService(null)
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
                    >
                      🎯 Fazer Novo Agendamento
                    </Button>
                    
                    <Button
                      onClick={() => {
                        // Compartilhar no WhatsApp
                        const message = `🎉 Agendamento confirmado!\n\n📅 Data: ${formatBrazilDate(parseDate(selectedDate))}\n⏰ Horário: ${selectedTime}\n✂️ Serviço: ${selectedService?.name}\n👨‍💼 Profissional: ${selectedProfessional?.name || "Qualquer profissional"}\n💰 Valor: ${formatCurrency(selectedService?.price)}`
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                        window.open(whatsappUrl, '_blank')
                      }}
                      variant="outline"
                      className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-600/10 font-semibold py-3 transition-all duration-300 hover:scale-105"
                    >
                      📱 Compartilhar no WhatsApp
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
