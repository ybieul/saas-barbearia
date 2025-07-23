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
import { useToast } from "@/hooks/use-toast"

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState("todos")
  const [selectedStatus, setSelectedStatus] = useState("todos")
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
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

  // Função para gerar horários baseado nos horários de funcionamento específicos por dia
  const generateTimeSlotsForDate = (date: Date) => {
    try {
      const slots = []
      
      // Verificar se o estabelecimento está aberto no dia
      if (!isEstablishmentOpen(date)) {
        return []
      }
      
      // Obter horários específicos do dia
      const dayConfig = getWorkingHoursForDay(date)
      
      if (!dayConfig.isOpen || !dayConfig.startTime || !dayConfig.endTime) {
        return []
      }
      
      // Converter horários para números
      const [startHour, startMinute] = dayConfig.startTime.split(':').map(Number)
      const [endHour, endMinute] = dayConfig.endTime.split(':').map(Number)
      
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      const interval = 5 // Intervalos de 5 minutos
      
      // Gerar slots apenas dentro do horário de funcionamento
      for (let currentMinutes = startTotalMinutes; currentMinutes < endTotalMinutes; currentMinutes += interval) {
        const hour = Math.floor(currentMinutes / 60)
        const minute = currentMinutes % 60
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
      
      return slots
    } catch (error) {
      console.error('Erro ao gerar slots de horário:', error)
      return []
    }
  }

  // Função para gerar horários (baseado nos horários de funcionamento do estabelecimento) - mantida para compatibilidade
  const generateTimeSlots = () => {
    return generateTimeSlotsForDate(currentDate)
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
        if (apt.status === 'CANCELLED') return false
        
        // Ignorar o próprio agendamento em caso de edição
        if (editingAppointment && apt.id === editingAppointment.id) return false
        
        const aptDate = new Date(apt.dateTime)
        return aptDate.toDateString() === newStartTime.toDateString()
      })
      
      // Verificar conflitos
      return dayAppointments.some(existingApt => {
        const existingStartTime = new Date(existingApt.dateTime)
        const existingServiceDuration = existingApt.service?.duration || 30
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
      console.error('Erro ao verificar conflitos:', error)
      return true // Em caso de erro, considerar como conflito para segurança
    }
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
    const totalSlotsInDay = generateTimeSlots().length
    const totalOccupiedSlots = today.reduce((sum, apt) => {
      const serviceDuration = apt.service?.duration || apt.duration || 30
      const slotsNeeded = Math.ceil(serviceDuration / 5) // slots de 5 minutos
      return sum + slotsNeeded
    }, 0)
    
    const occupancyRate = Math.round((totalOccupiedSlots / totalSlotsInDay) * 100)

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

  // Validação de dados com verificação de conflitos em tempo real
  const validateForm = async () => {
    setIsValidating(true)
    try {
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

      if (!newAppointment.time) {
        toast({
          title: "Erro",
          description: "Selecione um horário",
          variant: "destructive",
        })
        return false
      }

      // Validar se estabelecimento está aberto no dia selecionado
      const selectedDate = new Date(newAppointment.date)
      if (!isEstablishmentOpen(selectedDate)) {
        const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })
        toast({
          title: "Estabelecimento Fechado",
          description: `O estabelecimento não funciona ${dayName}. Escolha outro dia.`,
          variant: "destructive",
        })
        return false
      }

      // Validar se horário está dentro do funcionamento
      if (!isTimeWithinWorkingHours(selectedDate, newAppointment.time)) {
        const dayConfig = getWorkingHoursForDay(selectedDate)
        toast({
          title: "Fora do Horário de Funcionamento",
          description: `Horário disponível: ${dayConfig.startTime} às ${dayConfig.endTime}`,
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return false
      }

      // Recarregar dados do banco antes da validação final
      await fetchAppointments()
      
      // Verificar conflitos com dados atualizados
      const appointmentData = {
        date: newAppointment.date,
        time: newAppointment.time,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined
      }
      
      if (hasConflict(appointmentData)) {
        toast({
          title: "Conflito de Horário",
          description: "Este horário já está ocupado. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
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
    } catch (error) {
      console.error('Erro na validação:', error)
      toast({
        title: "Erro de Validação",
        description: "Erro ao validar agendamento. Tente novamente.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsValidating(false)
    }
  }

  // Criar agendamento com validação robusta
  const handleCreateAppointment = async () => {
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
          title: "Conflito Detectado",
          description: "Este horário foi ocupado por outro agendamento. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return
      }

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

      const finalAppointmentData = {
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined,
        dateTime: appointmentDateTime.toISOString(),
        notes: newAppointment.notes || undefined
      }

      await createAppointment(finalAppointmentData)
      
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      resetForm()
      await fetchAppointments() // Recarregar dados
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento. Tente novamente.",
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

  // Atualizar agendamento existente com validação
  const handleUpdateAppointment = async () => {
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
          title: "Conflito Detectado",
          description: "Este horário foi ocupado por outro agendamento. Escolha outro horário.",
          variant: "destructive",
        })
        setNewAppointment(prev => ({...prev, time: ""}))
        return
      }

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

      const finalAppointmentData = {
        id: editingAppointment.id,
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined,
        dateTime: appointmentDateTime.toISOString(),
        notes: newAppointment.notes || undefined
      }

      await updateAppointment(finalAppointmentData)
      
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso!",
      })
      
      setIsNewAppointmentOpen(false)
      setEditingAppointment(null)
      resetForm()
      await fetchAppointments() // Recarregar dados
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento. Tente novamente.",
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

  // Função melhorada para obter horários disponíveis para o modal
  const getAvailableTimeSlots = () => {
    try {
      if (!newAppointment.serviceId || !newAppointment.date) return []
      
      const selectedService = services.find(s => s.id === newAppointment.serviceId)
      if (!selectedService) return []
      
      const selectedDate = new Date(newAppointment.date)
      
      // Verificar se o estabelecimento está aberto no dia
      if (!isEstablishmentOpen(selectedDate)) {
        return []
      }
      
      // Gerar slots para a data específica
      const availableSlots = generateTimeSlotsForDate(selectedDate)
      
      // Filtrar slots que não têm conflito
      return availableSlots.filter(time => {
        const testAppointment = {
          date: newAppointment.date,
          time: time,
          serviceId: newAppointment.serviceId,
          professionalId: newAppointment.professionalId || undefined
        }
        
        return !hasConflict(testAppointment)
      })
    } catch (error) {
      console.error('Erro ao obter horários disponíveis:', error)
      return []
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Agenda</h1>
          <p className="text-[#a1a1aa]">Gerencie seus agendamentos</p>
        </div>
        
        <Button 
          onClick={() => setIsNewAppointmentOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669]"
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
          <div className="max-h-96 overflow-y-auto">
            {generateTimeSlots().map((time) => {
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
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
                        <p className="text-[#10b981]">Disponível - Clique para agendar</p>
                      </div>
                    )}
                  </div>
                  
                  {!isOccupied && (
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
          })
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
                    min={new Date().toISOString().split('T')[0]} // Não permitir datas passadas
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value)
                      if (!isEstablishmentOpen(selectedDate)) {
                        const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })
                        toast({
                          title: "Dia Indisponível",
                          description: `Estabelecimento fechado ${dayName}. Escolha outro dia.`,
                          variant: "destructive",
                        })
                        return
                      }
                      setNewAppointment({...newAppointment, date: e.target.value, time: ""})
                    }}
                    className="bg-[#18181b] border-[#27272a] text-[#ededed]"
                  />
                  {newAppointment.date && (
                    <p className="text-xs text-[#a1a1aa] mt-1">
                      {(() => {
                        const selectedDate = new Date(newAppointment.date)
                        const dayConfig = getWorkingHoursForDay(selectedDate)
                        if (!dayConfig.isOpen) {
                          return "⚠️ Estabelecimento fechado neste dia"
                        }
                        return `✅ Funcionamento: ${dayConfig.startTime} às ${dayConfig.endTime}`
                      })()}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="time" className="text-[#ededed]">Horário *</Label>
                  <Select 
                    value={newAppointment.time} 
                    onValueChange={(value) => setNewAppointment({...newAppointment, time: value})}
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
                          Nenhum horário disponível
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
                disabled={!newAppointment.endUserId || !newAppointment.serviceId || !newAppointment.date || !newAppointment.time || isCreating || isValidating}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                {isCreating ? 
                  (editingAppointment ? "Atualizando..." : "Criando...") : 
                  isValidating ? "Validando..." :
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
