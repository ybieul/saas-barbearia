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
  const [isPageReady, setIsPageReady] = useState(false) // Novo estado para controlar renderização
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
  const { workingHours, loading: workingHoursLoading, error: workingHoursError } = useWorkingHours()
  const { toast } = useToast()

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchAppointments()
    fetchClients()
    fetchServices()
    fetchProfessionals()
    fetchEstablishment()
  }, [fetchAppointments, fetchClients, fetchServices, fetchProfessionals, fetchEstablishment])

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

  // Função auxiliar para obter horários de funcionamento com fallback seguro
  const getWorkingHoursForDay = useCallback((date: Date) => {
    try {
      if (!workingHours || !Array.isArray(workingHours) || workingHours.length === 0) {
        return null
      }

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[date.getDay()]
      
      if (!dayName) return null
      
      return workingHours.find(wh => wh && wh.dayOfWeek === dayName) || null
    } catch (error) {
      console.error('Erro ao obter horários de funcionamento:', error)
      return null
    }
  }, [workingHours])

  // Função para gerar horários (baseado nos horários de funcionamento do estabelecimento)
  const generateTimeSlots = useCallback(() => {
    try {
      // Verificar se os dados de horários de funcionamento estão carregados
      if (workingHoursLoading || !workingHours || !Array.isArray(workingHours)) {
        return []
      }

      const dayWorkingHours = getWorkingHoursForDay(currentDate)
      
      // Se não há horário configurado ou o dia está inativo, retornar array vazio
      if (!dayWorkingHours || !dayWorkingHours.isActive) {
        return []
      }
      
      // Usar horários configurados
      const startTime = dayWorkingHours.startTime || "08:00"
      const endTime = dayWorkingHours.endTime || "18:00"
      
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      const interval = 15 // Intervalos de 15 minutos (consistente com configurações)
      const slots = []
      
      for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += interval) {
        const hour = Math.floor(totalMinutes / 60)
        const minute = totalMinutes % 60
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
      
      return slots
    } catch (error) {
      console.error('Erro ao gerar horários:', error)
      return []
    }
  }, [workingHoursLoading, workingHours, currentDate, getWorkingHoursForDay])

  // Obter agendamentos do dia atual - com verificação segura
  const todayAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return []
    
    return appointments.filter(apt => {
      try {
        const aptDate = new Date(apt.dateTime || apt.date)
        return aptDate.toDateString() === currentDate.toDateString()
      } catch {
        return false
      }
    })
  }, [appointments, currentDate])

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
    const totalSlotsInDay = getAvailableTimeSlotsForDate(currentDate).length || 1 // Evitar divisão por zero
    const totalOccupiedSlots = today.reduce((sum, apt) => {
      const serviceDuration = apt.service?.duration || apt.duration || 30
      const slotsNeeded = Math.ceil(serviceDuration / 15) // slots de 15 minutos
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

  // Memoizar o cálculo das estatísticas para evitar chamadas desnecessárias
  const dayStats = useMemo(() => {
    // Só calcular quando todos os dados estão carregados
    if (workingHoursLoading || !workingHours || appointmentsLoading) {
      return {
        appointmentsToday: 0,
        completed: 0,
        pending: 0,
        occupancyRate: 0,
        revenueToday: 0
      }
    }

    return calculateDayStats()
  }, [workingHoursLoading, workingHours, appointmentsLoading, todayAppointments, currentDate])

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
    const slots = getAvailableTimeSlotsForDate(currentDate)
    for (const slot of slots) {
      if (canScheduleService(slot, serviceDuration, professionalId)) {
        return slot
      }
    }
    return null
  }

  // Função para obter horários disponíveis para uma data específica
  const getAvailableTimeSlotsForDate = useCallback((date: Date) => {
    try {
      // Verificar se os dados de horários de funcionamento estão carregados
      if (workingHoursLoading || !workingHours || !Array.isArray(workingHours)) {
        return []
      }

      const dayWorkingHours = getWorkingHoursForDay(date)
      
      // Se não há horário configurado ou o dia está inativo, retornar array vazio
      if (!dayWorkingHours || !dayWorkingHours.isActive) {
        return []
      }
      
      // Gerar slots para a data específica
      const startTime = dayWorkingHours.startTime || "08:00"
      const endTime = dayWorkingHours.endTime || "18:00"
      
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      
      const startTotalMinutes = startHour * 60 + startMinute
      const endTotalMinutes = endHour * 60 + endMinute
      
      const interval = 15 // Intervalos de 15 minutos
      const slots = []
      
      for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += interval) {
        const hour = Math.floor(totalMinutes / 60)
        const minute = totalMinutes % 60
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
      
      return slots
    } catch (error) {
      console.error('Erro ao obter horários disponíveis:', error)
      return []
    }
  }, [workingHoursLoading, workingHours, getWorkingHoursForDay])

  // Função para obter horários disponíveis para o modal
  const getAvailableTimeSlots = () => {
    if (!newAppointment.serviceId || !newAppointment.date) return []
    
    const selectedService = services.find(s => s.id === newAppointment.serviceId)
    if (!selectedService) return []
    
    const serviceDuration = selectedService.duration || 30
    const selectedDate = new Date(newAppointment.date)
    
    // Obter slots disponíveis para a data selecionada
    const availableSlots = getAvailableTimeSlotsForDate(selectedDate)
    
    // Obter agendamentos da data selecionada
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime || apt.date)
      return aptDate.toDateString() === selectedDate.toDateString()
    })
    
    return availableSlots.filter(time => {
      // Verificar se o horário pode acomodar o serviço
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const startMinutes = timeToMinutes(time)
      const endMinutes = startMinutes + serviceDuration
      
      // Verificar se o serviço cabe dentro do horário de funcionamento
      const dayEndTime = availableSlots[availableSlots.length - 1]
      if (!dayEndTime) return false
      
      const dayEndMinutes = timeToMinutes(dayEndTime) + 15 // Adicionar o intervalo do último slot
      if (endMinutes > dayEndMinutes) return false
      
      // Verificar conflitos com agendamentos existentes
      const isConflicting = dayAppointments.some(apt => {
        const aptStartTime = new Date(apt.dateTime || `${apt.date} ${apt.time}`)
        const aptStartTimeString = aptStartTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        
        const aptServiceDuration = apt.service?.duration || apt.duration || 30
        const aptStartMinutes = timeToMinutes(aptStartTimeString)
        const aptEndMinutes = aptStartMinutes + aptServiceDuration
        
        // Verificar se há sobreposição de horários
        const hasOverlap = (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes)
        
        // Verificar se é o mesmo profissional (se especificado)
        const matchesProfessional = !newAppointment.professionalId || 
                                   apt.professionalId === newAppointment.professionalId
        
        return hasOverlap && matchesProfessional
      })
      
      return !isConflicting
    })
  }

  // Verificar se todos os dados necessários estão carregados e válidos
  const isDataReady = useMemo(() => {
    const loadingStates = [
      appointmentsLoading,
      clientsLoading, 
      servicesLoading,
      establishmentLoading,
      workingHoursLoading
    ]
    
    const dataStates = [
      appointments !== undefined,
      clients !== undefined,
      services !== undefined,
      workingHours !== undefined && workingHours !== null
    ]
    
    const allDataLoaded = !loadingStates.some(loading => loading === true)
    const allDataValid = dataStates.every(valid => valid === true)
    
    return allDataLoaded && allDataValid
  }, [
    appointmentsLoading, clientsLoading, servicesLoading, 
    establishmentLoading, workingHoursLoading,
    appointments, clients, services, workingHours
  ])

  // Controlar quando a página está pronta para ser renderizada
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDataReady) {
        setIsPageReady(true)
      }
    }, 50) // Pequeno delay para garantir que tudo está estabilizado

    return () => clearTimeout(timer)
  }, [isDataReady])

  // Early return se os dados não estão prontos
  if (!isDataReady || !isPageReady) {
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
            Grade de 15 em 15 minutos - Horários configurados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {getAvailableTimeSlotsForDate(currentDate).length > 0 ? (
              getAvailableTimeSlotsForDate(currentDate).map((time) => {
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
            })
            ) : (
              <div className="p-8 text-center text-[#71717a]">
                <Clock className="w-12 h-12 mx-auto mb-4 text-[#3f3f46]" />
                <p className="text-lg mb-2">Estabelecimento fechado</p>
                <p className="text-sm">Não há horários de funcionamento configurados para este dia.</p>
              </div>
            )}
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
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="bg-[#18181b] border-[#27272a] text-[#ededed]"
                  />
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
