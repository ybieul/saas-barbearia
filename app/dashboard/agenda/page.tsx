"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useProfessionals } from "@/hooks/use-api"
import { useAppointments, useClients, useServices, useEstablishment } from "@/hooks/use-api"
import { useWorkingHours } from "@/hooks/use-working-hours"
import { useToast } from "@/components/ui/use-toast"

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState("todos")
  const [selectedStatus, setSelectedStatus] = useState("todos")
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'complete' | 'cancel' | null
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
  
  // Hooks para dados reais do banco de dados
  const { appointments, loading: appointmentsLoading, error: appointmentsError, fetchAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointments()
  const { clients, loading: clientsLoading, error: clientsError, fetchClients } = useClients()
  const { services, loading: servicesLoading, error: servicesError, fetchServices } = useServices()
  const { professionals: professionalsData, loading: professionalsLoading, fetchProfessionals } = useProfessionals()
  const { establishment, loading: establishmentLoading, fetchEstablishment } = useEstablishment()
  const { workingHours, loading: workingHoursLoading, fetchWorkingHours } = useWorkingHours()
  const { toast } = useToast()

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchAppointments()
    fetchClients()
    fetchServices()
    fetchProfessionals()
    fetchEstablishment()
    fetchWorkingHours()
  }, [fetchAppointments, fetchClients, fetchServices, fetchProfessionals, fetchEstablishment, fetchWorkingHours])

  // Debug para verificar se os dados estão chegando
  useEffect(() => {
    console.log('Dados carregados:', {
      appointments: appointments?.length || 0,
      clients: clients?.length || 0,
      services: services?.length || 0,
      professionals: professionalsData?.length || 0
    })
  }, [appointments, clients, services, professionalsData])

  // Limpar horário quando serviço, data ou profissional mudam
  useEffect(() => {
    if (newAppointment.serviceId || newAppointment.date || newAppointment.professionalId) {
      setNewAppointment(prev => ({...prev, time: ""}))
    }
  }, [newAppointment.serviceId, newAppointment.date, newAppointment.professionalId])

  // Função para verificar se um dia está disponível (estabelecimento aberto)
  const isDayAvailable = (date: Date) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[date.getDay()]
    
    const workingHoursForDay = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
    return workingHoursForDay?.isActive || false
  }

  // Função para obter horários de funcionamento de um dia específico
  const getDayWorkingHours = (date: Date) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[date.getDay()]
    
    const workingHoursForDay = workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
    
    if (!workingHoursForDay?.isActive) {
      return null
    }
    
    return {
      startTime: workingHoursForDay.startTime,
      endTime: workingHoursForDay.endTime
    }
  }

  // Função para gerar horários (baseado nos horários de funcionamento do estabelecimento)
  const generateTimeSlots = (specificDate?: Date) => {
    const slots = []
    
    // Se uma data específica foi fornecida, usar os horários daquele dia
    if (specificDate) {
      const dayHours = getDayWorkingHours(specificDate)
      if (!dayHours) return [] // Dia não disponível
      
      const startHour = parseInt(dayHours.startTime.split(':')[0])
      const startMinute = parseInt(dayHours.startTime.split(':')[1])
      const endHour = parseInt(dayHours.endTime.split(':')[0])
      const endMinute = parseInt(dayHours.endTime.split(':')[1])
      
      const interval = 5 // Intervalos de 5 minutos
      
      // Converter tudo para minutos para facilitar o cálculo
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += interval) {
        const hour = Math.floor(totalMinutes / 60)
        const minute = totalMinutes % 60
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
      
      return slots
    }
    
    // Fallback para usar horários do establishment (compatibilidade)
    const defaultStartHour = 8
    const defaultEndHour = 18
    
    const startHour = establishment?.openTime ? 
      parseInt(establishment.openTime.split(':')[0]) : defaultStartHour
    const endHour = establishment?.closeTime ? 
      parseInt(establishment.closeTime.split(':')[0]) : defaultEndHour
    
    const interval = 5 // Intervalos de 5 minutos
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  // Obter agendamentos do dia atual
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.dateTime || apt.date)
    return aptDate.toDateString() === currentDate.toDateString()
  })

  // Função para verificar se um horário está ocupado (considerando duração do serviço)
  const isTimeSlotOccupied = (time: string, professionalId?: string) => {
    return todayAppointments.some(apt => {
      const aptStartTime = new Date(apt.dateTime || `${apt.date} ${apt.time}`)
      const aptStartTimeString = aptStartTime.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      
      // Obter duração do serviço (em minutos)
      const serviceDuration = apt.service?.duration || apt.duration || 30
      
      // Calcular horário de fim do agendamento
      const aptEndTime = new Date(aptStartTime.getTime() + (serviceDuration * 60000))
      const aptEndTimeString = aptEndTime.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      
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
  }

  // Função para verificar se é possível agendar um serviço em determinado horário
  const canScheduleService = (time: string, serviceDuration: number, professionalId?: string) => {
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
      
      if (slots.includes(slotTime) && isTimeSlotOccupied(slotTime, professionalId)) {
        return false
      }
    }
    
    return true
  }

  // Calcular estatísticas do dia
  const calculateDayStats = () => {
    const today = todayAppointments
    const completed = today.filter(apt => apt.status === 'completed' || apt.status === 'COMPLETED')
    const pending = today.filter(apt => apt.status === 'pending' || apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED')
    const inProgress = today.filter(apt => apt.status === 'IN_PROGRESS')
    const totalRevenue = completed.reduce((sum, apt) => sum + (Number(apt.totalPrice) || 0), 0)
    
    // Calcular taxa de ocupação baseada em minutos ocupados vs disponíveis
    const totalSlotsInDay = generateTimeSlots(currentDate).length
    const totalOccupiedSlots = today.reduce((sum, apt) => {
      const serviceDuration = apt.service?.duration || apt.duration || 30
      const slotsNeeded = Math.ceil(serviceDuration / 5) // slots de 5 minutos
      return sum + slotsNeeded
    }, 0)
    
    const occupancyRate = totalSlotsInDay > 0 ? Math.round((totalOccupiedSlots / totalSlotsInDay) * 100) : 0

    return {
      appointmentsToday: today.length,
      completed: completed.length,
      pending: pending.length + inProgress.length,
      occupancyRate: Math.min(occupancyRate, 100),
      revenueToday: totalRevenue
    }
  }

  const dayStats = calculateDayStats()

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
  }

  // Validação de dados
  const validateForm = () => {
    if (!newAppointment.endUserId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive",
      })
      return false
    }
    
    if (!newAppointment.serviceId) {
      toast({
        title: "Erro", 
        description: "Selecione um serviço",
        variant: "destructive",
      })
      return false
    }

    if (!newAppointment.date) {
      toast({
        title: "Erro",
        description: "Selecione uma data",
        variant: "destructive",
      })
      return false
    }

    // Verificar se a data selecionada está disponível (estabelecimento aberto)
    const selectedDate = new Date(newAppointment.date)
    if (!isDayAvailable(selectedDate)) {
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const dayName = dayNames[selectedDate.getDay()]
      
      toast({
        title: "Data Indisponível",
        description: `O estabelecimento não funciona às ${dayName}s. Selecione uma data em que o estabelecimento esteja aberto.`,
        variant: "destructive",
      })
      return false
    }

    if (!newAppointment.time) {
      toast({
        title: "Erro",
        description: "Selecione um horário",
        variant: "destructive",
      })
      return false
    }

    // Verificar se o horário ainda está disponível (dupla verificação)
    const selectedService = services.find(s => s.id === newAppointment.serviceId)
    if (selectedService) {
      const availableSlots = getAvailableTimeSlots()
      if (!availableSlots.includes(newAppointment.time)) {
        toast({
          title: "Horário Indisponível",
          description: "Este horário não está mais disponível. Selecione outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return false
      }
    }

    return true
  }

  // Criar agendamento
  const handleCreateAppointment = async () => {
    if (!validateForm()) return

    setIsCreating(true)
    try {
      // Criar dateTime sem problemas de fuso horário
      const [year, month, day] = newAppointment.date.split('-')
      const [hours, minutes] = newAppointment.time.split(':')
      const appointmentDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0
      )

      const appointmentData = {
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined,
        dateTime: appointmentDateTime.toISOString(),
        notes: newAppointment.notes || undefined
      }

      await createAppointment(appointmentData)
      
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      resetForm()
      fetchAppointments() // Recarregar dados
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Editar agendamento (função simples)
  const handleEditAppointment = (appointment: any) => {
    // Preencher o formulário com os dados do agendamento existente
    const appointmentDate = new Date(appointment.dateTime)
    const formattedDate = appointmentDate.toISOString().split('T')[0]
    const formattedTime = appointmentDate.toTimeString().split(' ')[0].substring(0, 5)
    
    setNewAppointment({
      endUserId: appointment.endUserId || appointment.endUser?.id || "",
      professionalId: appointment.professionalId || "",
      serviceId: appointment.serviceId || appointment.service?.id || "",
      date: formattedDate,
      time: formattedTime,
      notes: appointment.notes || ""
    })
    
    setEditingAppointment(appointment)
    setIsNewAppointmentOpen(true) // Reutilizar o modal existente
  }

  // Atualizar agendamento existente
  const handleUpdateAppointment = async () => {
    if (!validateForm() || !editingAppointment) return

    setIsCreating(true)
    try {
      // Criar dateTime sem problemas de fuso horário
      const [year, month, day] = newAppointment.date.split('-')
      const [hours, minutes] = newAppointment.time.split(':')
      const appointmentDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0
      )

      const appointmentData = {
        id: editingAppointment.id,
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined,
        dateTime: appointmentDateTime.toISOString(),
        notes: newAppointment.notes || undefined
      }

      await updateAppointment(appointmentData)
      
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      setEditingAppointment(null)
      resetForm()
      fetchAppointments() // Recarregar dados
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }
  const handleCompleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    const clientName = appointment?.endUser?.name || 'Cliente'
    const serviceName = appointment?.service?.name || 'Serviço'
    
    setConfirmDialog({
      isOpen: true,
      type: 'complete',
      appointmentId,
      clientName,
      serviceName
    })
  }

  // Abrir diálogo de confirmação para cancelar
  const handleCancelAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    const clientName = appointment?.endUser?.name || 'Cliente'
    const serviceName = appointment?.service?.name || 'Serviço'
    
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
      const status = confirmDialog.type === 'complete' ? 'COMPLETED' : 'CANCELLED'
      await updateAppointment({ id: confirmDialog.appointmentId, status })
      
      toast({
        title: "Sucesso",
        description: `Agendamento ${confirmDialog.type === 'complete' ? 'concluído' : 'cancelado'} com sucesso!`,
      })
      
      fetchAppointments() // Recarregar dados
    } catch (error) {
      toast({
        title: "Erro",
        description: `Erro ao ${confirmDialog.type === 'complete' ? 'concluir' : 'cancelar'} agendamento`,
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
    if (!confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) {
      return
    }

    try {
      await deleteAppointment(appointmentId)
      
      toast({
        title: "Sucesso",
        description: "Agendamento excluído com sucesso!",
      })
      
      fetchAppointments() // Recarregar dados
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir agendamento",
        variant: "destructive",
      })
    }
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

  // Filtrar agendamentos por data, profissional e status
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.dateTime).toDateString()
    const currentDateString = currentDate.toDateString()
    
    const matchesDate = appointmentDate === currentDateString
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
      SCHEDULED: { label: "Agendado", variant: "secondary" as const, color: "bg-blue-500" },
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
    const appointmentDateTime = new Date(dateTime)
    const now = new Date()
    return appointmentDateTime < now
  }

  // Função para obter a próxima disponibilidade
  const getNextAvailableTime = (serviceDuration: number, professionalId?: string) => {
    const slots = generateTimeSlots()
    for (const slot of slots) {
      if (canScheduleService(slot, serviceDuration, professionalId)) {
        return slot
      }
    }
    return null
  }

  // Função para obter horários disponíveis para o modal
  const getAvailableTimeSlots = () => {
    if (!newAppointment.serviceId || !newAppointment.date) return []
    
    const selectedService = services.find(s => s.id === newAppointment.serviceId)
    if (!selectedService) return []
    
    const serviceDuration = selectedService.duration || 30
    const selectedDate = new Date(newAppointment.date)
    
    // Verificar se o dia está disponível (estabelecimento aberto)
    if (!isDayAvailable(selectedDate)) {
      return []
    }
    
    // Obter agendamentos da data selecionada
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime || apt.date)
      return aptDate.toDateString() === selectedDate.toDateString()
    })
    
    // Gerar slots baseados nos horários de funcionamento daquele dia
    return generateTimeSlots(selectedDate).filter(time => {
      // Verificar se o horário pode acomodar o serviço
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const startMinutes = timeToMinutes(time)
      const endMinutes = startMinutes + serviceDuration
      
      // Verificar se todos os slots de 5min necessários estão livres
      const slots = generateTimeSlots(selectedDate)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 5) {
        const hours = Math.floor(currentMinutes / 60)
        const minutes = currentMinutes % 60
        const slotTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        
        if (!slots.includes(slotTime)) continue
        
        // Verificar se este slot está ocupado
        const isOccupied = dayAppointments.some(apt => {
          const aptStartTime = new Date(apt.dateTime || `${apt.date} ${apt.time}`)
          const aptStartTimeString = aptStartTime.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
          
          const aptServiceDuration = apt.service?.duration || apt.duration || 30
          const aptEndTime = new Date(aptStartTime.getTime() + (aptServiceDuration * 60000))
          const aptEndTimeString = aptEndTime.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
          
          const slotMinutes = timeToMinutes(slotTime)
          const aptStartMinutes = timeToMinutes(aptStartTimeString)
          const aptEndMinutes = timeToMinutes(aptEndTimeString)
          
          const isWithinAppointment = slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes
          const matchesProfessional = !newAppointment.professionalId || 
                                     apt.professionalId === newAppointment.professionalId
          
          return isWithinAppointment && matchesProfessional
        })
        
        if (isOccupied) {
          return false
        }
      }
      
      return true
    })
  }

  if (appointmentsLoading || clientsLoading || servicesLoading || establishmentLoading) {
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#ededed]">Agenda</h1>
            {isDayAvailable(currentDate) ? (
              <Badge className="bg-green-600 hover:bg-green-600 text-white">
                🟢 Aberto
              </Badge>
            ) : (
              <Badge variant="destructive">
                🔴 Fechado
              </Badge>
            )}
          </div>
          <p className="text-[#a1a1aa]">
            Gerencie seus agendamentos • {currentDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <Button 
          onClick={() => setIsNewAppointmentOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669]"
          disabled={!isDayAvailable(currentDate)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10b981]/20 rounded-lg">
                <Calendar className="w-5 h-5 text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm text-[#a1a1aa]">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-[#ededed]">{dayStats.appointmentsToday}</p>
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
                <p className="text-sm text-[#a1a1aa]">Concluídos</p>
                <p className="text-2xl font-bold text-[#ededed]">{dayStats.completed}</p>
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
                <p className="text-sm text-[#a1a1aa]">Pendentes</p>
                <p className="text-2xl font-bold text-[#ededed]">{dayStats.pending}</p>
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
                <p className="text-sm text-[#a1a1aa]">Taxa de Ocupação</p>
                <p className="text-2xl font-bold text-[#ededed]">{dayStats.occupancyRate}%</p>
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
                <p className="text-sm text-[#a1a1aa]">Receita Hoje</p>
                <p className="text-2xl font-bold text-[#ededed]">
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("prev")}
            className="border-[#27272a] hover:bg-[#27272a]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#ededed]">
              {formatDate(currentDate)}
            </h2>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate("next")}
            className="border-[#27272a] hover:bg-[#27272a]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-48 bg-[#18181b] border-[#27272a] text-[#ededed]">
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
          <SelectTrigger className="w-48 bg-[#18181b] border-[#27272a] text-[#ededed]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-[#27272a]">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="SCHEDULED">Agendado</SelectItem>
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
          <CardTitle className="text-[#ededed]">Grade de Horários</CardTitle>
          <CardDescription className="text-[#a1a1aa]">
            {isDayAvailable(currentDate) ? (
              <>
                Grade de 5 em 5 minutos - Horários de funcionamento: {getDayWorkingHours(currentDate)?.startTime || '08:00'} às {getDayWorkingHours(currentDate)?.endTime || '18:00'}
              </>
            ) : (
              <span className="text-red-400">
                🔴 Estabelecimento fechado hoje. Configurar horários de funcionamento nas Configurações.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isDayAvailable(currentDate) ? (
            <div className="p-8 text-center">
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Estabelecimento Fechado</h3>
                <p className="text-red-300 text-sm mb-4">
                  O estabelecimento não funciona hoje. Não é possível criar novos agendamentos.
                </p>
                <p className="text-xs text-gray-400">
                  Para alterar os horários de funcionamento, acesse a aba &quot;Configurações &gt; Horários&quot;.
                </p>
              </div>
            </div>
          ) : (
          <div className="max-h-96 overflow-y-auto">
            {generateTimeSlots(currentDate).map((time) => {
              const isOccupied = isTimeSlotOccupied(time)
              const appointment = todayAppointments.find(apt => {
                const aptTime = new Date(apt.dateTime || `${apt.date} ${apt.time}`).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                return aptTime === time
              })

              return (
                <div
                  key={time}
                  className={`flex items-center justify-between p-4 border-b border-[#27272a] hover:bg-[#27272a]/50 transition-colors ${
                    isOccupied ? 'bg-red-500/10' : 'bg-[#10b981]/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-[#ededed] font-medium">
                      {time}
                    </div>
                    {appointment ? (
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-3 h-3 rounded-full ${getStatusBadge(appointment.status).color}`}
                        ></div>
                        <div>
                          <p className="text-[#ededed] font-medium">
                            {appointment.endUser?.name || appointment.clientName || 'Cliente'}
                          </p>
                          <p className="text-[#a1a1aa] text-sm">
                            {appointment.service?.name || appointment.serviceName || 'Serviço'} 
                            <span className="text-[#10b981]"> • {appointment.service?.duration || appointment.duration || 30}min</span>
                            {(appointment.professional?.name || appointment.professionalName) && 
                              ` • ${appointment.professional?.name || appointment.professionalName}`
                            }
                          </p>
                          <p className="text-xs text-[#71717a]">
                            Status: {getStatusBadge(appointment.status).label}
                          </p>
                        </div>
                      </div>
                    ) : isOccupied ? (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <p className="text-red-400">Ocupado (dentro de outro agendamento)</p>
                      </div>
                    ) : !isDayAvailable(currentDate) ? (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <p className="text-gray-400">Estabelecimento fechado</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
                        <p className="text-[#10b981]">Disponível - Clique para agendar</p>
                      </div>
                    )}
                  </div>
                  
                  {!isOccupied && isDayAvailable(currentDate) && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-white"
                        onClick={() => {
                          setNewAppointment({...newAppointment, time, date: currentDate.toISOString().split('T')[0]})
                          setIsNewAppointmentOpen(true)
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
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
                                <span className="text-xs text-[#a1a1aa]">
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
          )}
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
          <>
            {filteredAppointments.map((appointment) => {
            const status = getStatusBadge(appointment.status)
            const appointmentTime = new Date(appointment.dateTime).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <Card key={appointment.id} className="bg-[#18181b] border-[#27272a]">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-4 h-4 text-[#10b981]" />
                        <span className="font-semibold text-[#ededed]">{appointmentTime}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[#ededed]">
                          <strong>Cliente:</strong> {appointment.endUser?.name}
                        </p>
                        <p className="text-[#a1a1aa]">
                          <strong>Serviço:</strong> {appointment.service?.name}
                        </p>
                        {appointment.professional && (
                          <p className="text-[#a1a1aa]">
                            <strong>Profissional:</strong> {appointment.professional.name}
                          </p>
                        )}
                        {appointment.notes && (
                          <p className="text-[#a1a1aa]">
                            <strong>Observações:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-[#10b981] font-semibold">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(appointment.totalPrice || 0)}
                        </p>
                        <p className="text-[#a1a1aa] text-sm">
                          {appointment.duration || appointment.service?.duration || 0} min
                        </p>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-2">
                        {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                              className="border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-white"
                              title="Concluir agendamento"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              title="Cancelar agendamento"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAppointment(appointment)}
                          className="border-[#27272a] hover:bg-[#27272a]"
                          title="Editar agendamento"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          title="Excluir agendamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </>
        )}
      </div>

      {/* Modal de novo agendamento */}
      {isNewAppointmentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="bg-[#18181b] border-[#27272a] w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-[#ededed]">
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
              </CardTitle>
              <CardDescription className="text-[#a1a1aa]">
                {editingAppointment ? 'Atualize os dados do agendamento' : 'Preencha os dados do agendamento'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client" className="text-[#ededed]">Cliente *</Label>
                <Select 
                  value={newAppointment.endUserId} 
                  onValueChange={(value) => setNewAppointment({...newAppointment, endUserId: value})}
                >
                  <SelectTrigger className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a]">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="service" className="text-[#ededed]">Serviço *</Label>
                <Select 
                  value={newAppointment.serviceId} 
                  onValueChange={(value) => setNewAppointment({...newAppointment, serviceId: value})}
                >
                  <SelectTrigger className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a]">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {(Number(service.price) || 0).toFixed(2)} ({service.duration || 0}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="professional" className="text-[#ededed]">Profissional</Label>
                <Select 
                  value={newAppointment.professionalId} 
                  onValueChange={(value) => setNewAppointment({...newAppointment, professionalId: value})}
                >
                  <SelectTrigger className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                    <SelectValue placeholder="Selecione um profissional (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a]">
                    {professionalsData?.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name} - {professional.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-[#ededed]">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="bg-[#18181b] border-[#27272a] text-[#ededed]"
                  />
                  {newAppointment.date && !isDayAvailable(new Date(newAppointment.date)) && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ Estabelecimento fechado nesta data
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="time" className="text-[#ededed]">Horário *</Label>
                  <Select 
                    value={newAppointment.time} 
                    onValueChange={(value) => setNewAppointment({...newAppointment, time: value})}
                    disabled={!newAppointment.date || !isDayAvailable(new Date(newAppointment.date))}
                  >
                    <SelectTrigger className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-[#27272a] max-h-60">
                      {getAvailableTimeSlots().length > 0 ? (
                        getAvailableTimeSlots().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-[#a1a1aa] text-sm">
                          {newAppointment.date && !isDayAvailable(new Date(newAppointment.date)) ? 
                            "Estabelecimento fechado" : "Nenhum horário disponível"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    {newAppointment.serviceId ? 
                      `${getAvailableTimeSlots().length} horários disponíveis` : 
                      'Selecione um serviço primeiro'
                    }
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-[#ededed]">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o agendamento..."
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  className="bg-[#18181b] border-[#27272a] text-[#ededed]"
                />
              </div>
            </CardContent>
            
            <div className="flex justify-end gap-2 p-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewAppointmentOpen(false)
                  setEditingAppointment(null)
                  resetForm()
                }}
                className="border-[#27272a] hover:bg-[#27272a]"
              >
                Cancelar
              </Button>
              <Button
                onClick={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
                disabled={!newAppointment.endUserId || !newAppointment.serviceId || !newAppointment.date || !newAppointment.time || isCreating}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                {isCreating ? 
                  (editingAppointment ? "Atualizando..." : "Criando...") : 
                  (editingAppointment ? "Atualizar Agendamento" : "Criar Agendamento")
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
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed]">
          <DialogHeader>
            <DialogTitle className="text-[#ededed]">
              {confirmDialog.type === 'complete' ? 'Concluir Serviço' : 'Cancelar Serviço'}
            </DialogTitle>
            <DialogDescription className="text-[#a1a1aa]">
              {confirmDialog.type === 'complete' 
                ? 'Tem certeza que deseja marcar este serviço como concluído?' 
                : 'Tem certeza que deseja cancelar este serviço?'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <p className="text-[#ededed]">
                <strong>Cliente:</strong> {confirmDialog.clientName}
              </p>
              <p className="text-[#a1a1aa]">
                <strong>Serviço:</strong> {confirmDialog.serviceName}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({
                isOpen: false,
                type: null,
                appointmentId: '',
                clientName: '',
                serviceName: ''
              })}
              className="border-[#27272a] hover:bg-[#27272a]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              className={confirmDialog.type === 'complete' 
                ? "bg-[#10b981] hover:bg-[#059669]" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {confirmDialog.type === 'complete' ? 'Concluir' : 'Cancelar Serviço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
