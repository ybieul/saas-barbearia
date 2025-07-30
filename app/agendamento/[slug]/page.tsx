"use client"

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
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    notes: ""
  })
  
  // Estados de UI
  const [expandedPeriods, setExpandedPeriods] = useState({
    morning: true,
    afternoon: true,
    night: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Carregar dados do negócio
  useEffect(() => {
    loadBusinessData()
  }, [params.slug])

  // Carregar disponibilidade quando profissional ou data mudar
  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailability(selectedProfessional?.id || null, selectedDate)
    }
  }, [selectedProfessional, selectedDate, selectedService])

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

  // Carregar disponibilidade quando selecionar profissional e data
  const loadAvailability = async (professionalId: string | null, date: string) => {
    if (!date || !selectedService) return

    setLoadingAvailability(true)
    try {
      const queryParams = new URLSearchParams({
        date,
        serviceDuration: selectedService.duration.toString()
      })
      
      if (professionalId) {
        queryParams.append('professionalId', professionalId)
      }

      const response = await fetch(`/api/public/business/${params.slug}/availability?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setOccupiedSlots(data.occupiedSlots || [])
      } else {
        console.error('Erro ao carregar disponibilidade')
        setOccupiedSlots([])
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error)
      setOccupiedSlots([])
    } finally {
      setLoadingAvailability(false)
    }
  }

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
      
      // Verificar se o horário está ocupado
      const isOccupied = occupiedSlots.includes(timeString)
      
      slots.push({
        time: timeString,
        available: !isOccupied,
        period: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night',
        occupied: isOccupied
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

  // Carregar dados do cliente por telefone
  const handlePhoneChange = async (phone: string) => {
    setCustomerData(prev => ({ ...prev, phone }))
    
    if (phone.length >= 11) { // Telefone completo
      try {
        const response = await fetch(`/api/public/clients/search?phone=${phone}&businessSlug=${params.slug}`)
        if (response.ok) {
          const clientData = await response.json()
          setCustomerData(prev => ({
            ...prev,
            name: clientData.name || "",
            email: clientData.email || "",
            notes: clientData.notes || ""
          }))
          
          toast({
            title: "Cliente encontrado!",
            description: "Dados preenchidos automaticamente.",
          })
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error)
      }
    }
  }

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
      const selectedDateParsed = parseDate(selectedDate)
      const now = getBrazilNow()
      if (selectedDateParsed < now) {
        errors.push("Data não pode ser no passado")
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
    // Validar dados
    const validationErrors = validateAppointmentData()
    if (validationErrors.length > 0) {
      toast({
        title: "Dados inválidos",
        description: validationErrors.join(", "),
        variant: "destructive"
      })
      return
    }

    // Verificar se já não está processando (evitar múltiplos submits)
    if (isSubmitting) return

    setIsSubmitting(true)
    
    try {
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

      console.log('🚀 Criando agendamento público:', sanitizedData)

      const response = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao criar agendamento')
      }

      console.log('✅ Agendamento criado com sucesso:', result)

      toast({
        title: "✅ Sucesso!",
        description: "Agendamento criado com sucesso!",
      })

      setShowSuccess(true)

    } catch (error: any) {
      console.error('❌ Erro ao criar agendamento:', error)
      
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
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
              <CardDescription className="text-[#a1a1aa]">
                Agende seu horário de forma rápida e fácil
              </CardDescription>
              
              {/* Informações de contato */}
              <div className="flex flex-col gap-2 mt-4 text-sm text-[#71717a]">
                {businessData.businessPhone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{businessData.businessPhone}</span>
                  </div>
                )}
                {businessData.businessAddress && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-center">{businessData.businessAddress}</span>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Indicador de Progresso */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
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
                        <div
                          key={service.id}
                          onClick={() => {
                            setSelectedService(service)
                            setStep(2)
                          }}
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
                  
                  {/* Opção "Qualquer profissional" */}
                  <div
                    onClick={() => {
                      setSelectedProfessional(null)
                      setStep(3)
                    }}
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
                  
                  {professionals.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#71717a]">Nenhum profissional disponível</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {professionals.map((professional) => (
                        <div
                          key={professional.id}
                          onClick={() => {
                            setSelectedProfessional(professional)
                            setStep(3)
                          }}
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
                    {Array.from({ length: 7 }, (_, i) => {
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
                        <Button
                          key={dateString}
                          variant="outline"
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedDate(dateString)
                              setStep(4)
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
                      <Loader2 className="h-4 w-4 animate-spin inline-block ml-2" />
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
                      
                      return (
                        <div className="space-y-4">
                          {/* Manhã */}
                          {groupedSlots.morning.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                onClick={() => setExpandedPeriods(prev => ({...prev, morning: !prev.morning}))}
                                className="w-full justify-between text-[#ededed] hover:text-[#ededed] hover:bg-[#27272a] p-3"
                              >
                                <span className="font-medium">Manhã ({groupedSlots.morning.length} horários)</span>
                                {expandedPeriods.morning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              
                              {expandedPeriods.morning && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {groupedSlots.morning.map((slot) => (
                                    <div key={slot.time} className="relative">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          if (slot.available) {
                                            setSelectedTime(slot.time)
                                            setStep(5)
                                          }
                                        }}
                                        disabled={!slot.available}
                                        className={`w-full
                                          ${slot.occupied 
                                            ? 'bg-red-600 border-red-600 text-white opacity-60 cursor-not-allowed' 
                                            : slot.available 
                                              ? 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10' 
                                              : 'bg-red-600 opacity-60 cursor-not-allowed border-red-600 text-white'
                                          }
                                          ${selectedTime === slot.time 
                                            ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
                                            : ''
                                          }
                                        `}
                                      >
                                        <div className="text-center">
                                          <div>{slot.time}</div>
                                          {slot.occupied && (
                                            <div className="text-xs opacity-70 mt-1">
                                              Ocupado
                                            </div>
                                          )}
                                        </div>
                                      </Button>
                                    </div>
                                  ))}
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
                                className="w-full justify-between text-[#ededed] hover:text-[#ededed] hover:bg-[#27272a] p-3"
                              >
                                <span className="font-medium">Tarde ({groupedSlots.afternoon.length} horários)</span>
                                {expandedPeriods.afternoon ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              
                              {expandedPeriods.afternoon && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {groupedSlots.afternoon.map((slot) => (
                                    <div key={slot.time} className="relative">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          if (slot.available) {
                                            setSelectedTime(slot.time)
                                            setStep(5)
                                          }
                                        }}
                                        disabled={!slot.available}
                                        className={`w-full
                                          ${slot.occupied 
                                            ? 'bg-red-600 border-red-600 text-white opacity-60 cursor-not-allowed' 
                                            : slot.available 
                                              ? 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10' 
                                              : 'bg-red-600 opacity-60 cursor-not-allowed border-red-600 text-white'
                                          }
                                          ${selectedTime === slot.time 
                                            ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
                                            : ''
                                          }
                                        `}
                                      >
                                        <div className="text-center">
                                          <div>{slot.time}</div>
                                          {slot.occupied && (
                                            <div className="text-xs opacity-70 mt-1">
                                              Ocupado
                                            </div>
                                          )}
                                        </div>
                                      </Button>
                                    </div>
                                  ))}
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
                                className="w-full justify-between text-[#ededed] hover:text-[#ededed] hover:bg-[#27272a] p-3"
                              >
                                <span className="font-medium">Noite ({groupedSlots.night.length} horários)</span>
                                {expandedPeriods.night ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              
                              {expandedPeriods.night && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {groupedSlots.night.map((slot) => (
                                    <div key={slot.time} className="relative">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          if (slot.available) {
                                            setSelectedTime(slot.time)
                                            setStep(5)
                                          }
                                        }}
                                        disabled={!slot.available}
                                        className={`w-full
                                          ${slot.occupied 
                                            ? 'bg-red-600 border-red-600 text-white opacity-60 cursor-not-allowed' 
                                            : slot.available 
                                              ? 'border-[#27272a] text-[#ededed] hover:border-emerald-600 hover:bg-emerald-600/10' 
                                              : 'bg-red-600 opacity-60 cursor-not-allowed border-red-600 text-white'
                                          }
                                          ${selectedTime === slot.time 
                                            ? 'bg-emerald-800 ring-2 ring-white border-emerald-600' 
                                            : ''
                                          }
                                        `}
                                      >
                                        <div className="text-center">
                                          <div>{slot.time}</div>
                                          {slot.occupied && (
                                            <div className="text-xs opacity-70 mt-1">
                                              Ocupado
                                            </div>
                                          )}
                                        </div>
                                      </Button>
                                    </div>
                                  ))}
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

              {/* Etapa 5: Dados do Cliente */}
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
                    {/* Telefone - primeiro campo */}
                    <div>
                      <Label htmlFor="phone" className="text-[#ededed]">
                        Telefone *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={customerData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#71717a]"
                      />
                    </div>

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

                    <Button
                      onClick={() => setStep(6)}
                      disabled={!customerData.name || !customerData.phone || !customerData.email}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Continuar
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

              {/* Página de Sucesso */}
              {showSuccess && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-[#ededed]">
                    Agendamento confirmado!
                  </h3>
                  
                  <p className="text-[#a1a1aa] mb-6">
                    Seu agendamento foi realizado com sucesso. Você receberá uma confirmação por WhatsApp.
                  </p>
                  
                  <div className="bg-[#27272a] rounded-lg p-4 mb-6">
                    <p className="text-sm text-[#a1a1aa] mb-2">
                      <strong className="text-[#ededed]">Data e horário:</strong><br />
                      {formatBrazilDate(parseDate(selectedDate))} às {selectedTime}
                    </p>
                    <p className="text-sm text-[#a1a1aa]">
                      <strong className="text-[#ededed]">Serviço:</strong> {selectedService?.name}
                    </p>
                    <p className="text-sm text-[#a1a1aa]">
                      <strong className="text-[#ededed]">Profissional:</strong> {selectedProfessional?.name || "Qualquer profissional"}
                    </p>
                    <p className="text-sm text-[#a1a1aa]">
                      <strong className="text-[#ededed]">Valor:</strong> {formatCurrency(selectedService?.price)}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => {
                      // Reset do formulário
                      setStep(1)
                      setSelectedService(null)
                      setSelectedProfessional(null)
                      setSelectedDate("")
                      setSelectedTime("")
                      setCustomerData({name: "", phone: "", email: "", notes: ""})
                      setShowSuccess(false)
                    }}
                    variant="outline"
                    className="border-[#27272a] text-[#ededed] hover:bg-[#27272a]"
                  >
                    Fazer novo agendamento
                  </Button>
                </div>
              )}
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
