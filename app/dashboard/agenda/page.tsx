"use client"

import React, { useEffect, useState, useCallback } from 'react'
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
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"
import { ErrorBoundary } from "@/components/error-boundary"
import { logger } from "@/lib/logger"
import { useTimezone } from "@/hooks/use-timezone"
import { AgendaProvider, useAgenda } from "@/contexts/agenda-context"

// Componentes da agenda separados para melhor organização
import AppointmentModal from './components/appointment-modal'
import ConfirmDialog from './components/confirm-dialog'
import PaymentModal from './components/payment-modal'

/**
 * Componente principal da agenda - Refatorado com:
 * - Error Boundaries
 * - Logging estruturado
 * - Timezone handling preciso
 * - Race condition protection
 * - Estado global unificado
 */
function AgendaPageContent() {
  const { toast } = useToast()
  const { formatDate, convertDate, now } = useTimezone()
  const { state, actions } = useAgenda()

  // Estados locais para UI
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [appointmentToComplete, setAppointmentToComplete] = useState<any>(null)
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

  // Log de inicialização
  useEffect(() => {
    logger.info('Agenda iniciada', {
      component: 'AgendaPage',
      timestamp: now(),
      selectedDate: state.selectedDate,
      viewMode: state.viewMode
    })
  }, [])

  // Carregar dados iniciais ao montar
  useEffect(() => {
    const loadInitialData = async () => {
      logger.info('Carregando dados iniciais da agenda')
      
      try {
        await actions.loadAllData()
        
        logger.info('Dados iniciais carregados com sucesso', {
          appointmentsCount: state.appointments.length,
          professionalsCount: state.professionals.length,
          servicesCount: state.services.length,
          clientsCount: state.clients.length
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error('Falha ao carregar dados iniciais', { error: errorMessage })
        
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados da agenda. Tente novamente.",
          variant: "destructive"
        })
      }
    }

    loadInitialData()
  }, []) // Apenas na montagem

  // Recarregar agendamentos quando data ou profissional mudar
  useEffect(() => {
    if (state.selectedDate && !state.loading.global) {
      logger.debug('Filtros alterados, recarregando agendamentos', {
        selectedDate: state.selectedDate,
        selectedProfessional: state.selectedProfessional
      })
      
      actions.loadAppointments(state.selectedDate, state.selectedProfessional || undefined)
    }
  }, [state.selectedDate, state.selectedProfessional])

  // Handlers para navegação de datas
  const handlePreviousDay = useCallback(() => {
    const currentDate = convertDate(state.selectedDate)
    if (currentDate) {
      const previousDay = new Date(currentDate.brazil)
      previousDay.setDate(previousDay.getDate() - 1)
      
      const utcDate = convertDate(previousDay)
      if (utcDate) {
        actions.setSelectedDate(utcDate.iso)
        logger.debug('Navegação para dia anterior', { 
          from: state.selectedDate, 
          to: utcDate.iso 
        })
      }
    }
  }, [state.selectedDate, convertDate, actions])

  const handleNextDay = useCallback(() => {
    const currentDate = convertDate(state.selectedDate)
    if (currentDate) {
      const nextDay = new Date(currentDate.brazil)
      nextDay.setDate(nextDay.getDate() + 1)
      
      const utcDate = convertDate(nextDay)
      if (utcDate) {
        actions.setSelectedDate(utcDate.iso)
        logger.debug('Navegação para próximo dia', { 
          from: state.selectedDate, 
          to: utcDate.iso 
        })
      }
    }
  }, [state.selectedDate, convertDate, actions])

  const handleToday = useCallback(() => {
    const todayUTC = convertDate(new Date())
    if (todayUTC) {
      actions.setSelectedDate(todayUTC.iso)
      logger.debug('Navegação para hoje', { date: todayUTC.iso })
    }
  }, [convertDate, actions])

  // Handler para criar agendamento
  const handleCreateAppointment = useCallback(async (appointmentData: any) => {
    logger.info('Iniciando criação de agendamento', { appointmentData })
    
    try {
      const appointmentId = await actions.createAppointment(appointmentData)
      
      if (appointmentId) {
        logger.info('Agendamento criado com sucesso', { id: appointmentId })
        
        toast({
          title: "Agendamento criado",
          description: "O agendamento foi criado com sucesso.",
        })
        
        setIsNewAppointmentOpen(false)
        return true
      } else {
        throw new Error('Falha na criação do agendamento')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Falha ao criar agendamento', { error: errorMessage, appointmentData })
      
      toast({
        title: "Erro ao criar agendamento",
        description: errorMessage,
        variant: "destructive"
      })
      
      return false
    }
  }, [actions, toast])

  // Handler para confirmar agendamento
  const handleConfirmAppointment = useCallback(async (appointmentId: string) => {
    logger.info('Confirmando agendamento', { appointmentId })
    
    try {
      const success = await actions.updateAppointment(appointmentId, { status: 'confirmed' })
      
      if (success) {
        logger.info('Agendamento confirmado', { appointmentId })
        
        toast({
          title: "Agendamento confirmado",
          description: "O agendamento foi confirmado com sucesso.",
        })
      } else {
        throw new Error('Falha ao confirmar agendamento')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Falha ao confirmar agendamento', { error: errorMessage, appointmentId })
      
      toast({
        title: "Erro ao confirmar",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [actions, toast])

  // Handler para cancelar agendamento
  const handleCancelAppointment = useCallback(async (appointmentId: string) => {
    logger.info('Cancelando agendamento', { appointmentId })
    
    try {
      const success = await actions.updateAppointment(appointmentId, { status: 'cancelled' })
      
      if (success) {
        logger.info('Agendamento cancelado', { appointmentId })
        
        toast({
          title: "Agendamento cancelado",
          description: "O agendamento foi cancelado.",
        })
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      } else {
        throw new Error('Falha ao cancelar agendamento')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Falha ao cancelar agendamento', { error: errorMessage, appointmentId })
      
      toast({
        title: "Erro ao cancelar",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [actions, toast])

  // Handler para completar agendamento
  const handleCompleteAppointment = useCallback(async (appointmentId: string) => {
    logger.info('Completando agendamento', { appointmentId })
    
    try {
      const success = await actions.updateAppointment(appointmentId, { status: 'completed' })
      
      if (success) {
        logger.info('Agendamento completado', { appointmentId })
        
        toast({
          title: "Agendamento finalizado",
          description: "O agendamento foi finalizado com sucesso.",
        })
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      } else {
        throw new Error('Falha ao completar agendamento')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Falha ao completar agendamento', { error: errorMessage, appointmentId })
      
      toast({
        title: "Erro ao finalizar",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [actions, toast])

  // Handler para excluir agendamento
  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    logger.info('Excluindo agendamento', { appointmentId })
    
    try {
      const success = await actions.deleteAppointment(appointmentId)
      
      if (success) {
        logger.info('Agendamento excluído', { appointmentId })
        
        toast({
          title: "Agendamento excluído",
          description: "O agendamento foi excluído permanentemente.",
        })
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      } else {
        throw new Error('Falha ao excluir agendamento')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Falha ao excluir agendamento', { error: errorMessage, appointmentId })
      
      toast({
        title: "Erro ao excluir",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [actions, toast])

  // Handler manual de refresh
  const handleRefresh = useCallback(async () => {
    logger.info('Refresh manual solicitado')
    await actions.refreshData()
  }, [actions])

  // Calcular estatísticas para o cabeçalho
  const dayAppointments = actions.getAppointmentsByDate(state.selectedDate)
  const stats = {
    total: dayAppointments.length,
    confirmed: dayAppointments.filter(apt => apt.status === 'confirmed').length,
    pending: dayAppointments.filter(apt => apt.status === 'scheduled').length,
    completed: dayAppointments.filter(apt => apt.status === 'completed').length,
    cancelled: dayAppointments.filter(apt => apt.status === 'cancelled').length
  }

  // Render condicional de loading
  if (state.loading.global && state.appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho com estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">
            {formatDate(state.selectedDate, { format: 'long' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Estatísticas rápidas */}
          <div className="hidden md:flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {stats.total} agendamentos
            </Badge>
            {stats.pending > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {stats.pending} pendentes
              </Badge>
            )}
            {stats.confirmed > 0 && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {stats.confirmed} confirmados
              </Badge>
            )}
          </div>
          
          {/* Botão de refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={state.loading.global}
          >
            <RefreshCw className={`h-4 w-4 ${state.loading.global ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Botão novo agendamento */}
          <Button onClick={() => setIsNewAppointmentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Filtros e navegação */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            {/* Navegação de data */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousDay}
                disabled={state.loading.appointments}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={handleToday}
                disabled={state.loading.appointments}
              >
                Hoje
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                disabled={state.loading.appointments}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Select
                  value={state.selectedProfessional || "todos"}
                  onValueChange={(value) => 
                    actions.setSelectedProfessional(value === "todos" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos profissionais</SelectItem>
                    {state.professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={state.viewMode}
                  onValueChange={(value: 'day' | 'week' | 'month') => 
                    actions.setViewMode(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exibição de erros */}
      {state.errors.global && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro no carregamento</p>
                <p className="text-sm text-muted-foreground">{state.errors.global}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={actions.clearErrors}
                className="ml-auto"
              >
                Dispensar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade de agendamentos */}
      <div className="grid gap-4">
        {state.loading.appointments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando agendamentos...</span>
          </div>
        ) : dayAppointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não há agendamentos para {formatDate(state.selectedDate, { format: 'date' })}
                </p>
                <Button onClick={() => setIsNewAppointmentOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro agendamento
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          dayAppointments
            .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
            .map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onConfirm={() => handleConfirmAppointment(appointment.id)}
                onCancel={() => setConfirmDialog({
                  isOpen: true,
                  type: 'cancel',
                  appointmentId: appointment.id,
                  clientName: appointment.client?.name || 'Cliente',
                  serviceName: appointment.service?.name || 'Serviço'
                })}
                onComplete={() => setConfirmDialog({
                  isOpen: true,
                  type: 'complete',
                  appointmentId: appointment.id,
                  clientName: appointment.client?.name || 'Cliente',
                  serviceName: appointment.service?.name || 'Serviço'
                })}
                onDelete={() => setConfirmDialog({
                  isOpen: true,
                  type: 'delete',
                  appointmentId: appointment.id,
                  clientName: appointment.client?.name || 'Cliente',
                  serviceName: appointment.service?.name || 'Serviço'
                })}
                onEdit={(apt) => {
                  // TODO: Implementar edição
                  logger.info('Edição de agendamento solicitada', { appointmentId: apt.id })
                }}
              />
            ))
        )}
      </div>

      {/* Modais */}
      <AppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onSubmit={handleCreateAppointment}
        professionals={state.professionals}
        services={state.services}
        clients={state.clients}
        selectedDate={state.selectedDate}
        mode="create"
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          switch (confirmDialog.type) {
            case 'complete':
              handleCompleteAppointment(confirmDialog.appointmentId)
              break
            case 'cancel':
              handleCancelAppointment(confirmDialog.appointmentId)
              break
            case 'delete':
              handleDeleteAppointment(confirmDialog.appointmentId)
              break
          }
        }}
        type={confirmDialog.type}
        clientName={confirmDialog.clientName}
        serviceName={confirmDialog.serviceName}
      />
    </div>
  )
}

// Componente do card de agendamento
interface AppointmentCardProps {
  appointment: any
  onConfirm: () => void
  onCancel: () => void
  onComplete: () => void
  onDelete: () => void
  onEdit: (appointment: any) => void
}

function AppointmentCard({ 
  appointment, 
  onConfirm, 
  onCancel, 
  onComplete, 
  onDelete, 
  onEdit 
}: AppointmentCardProps) {
  const { formatDate } = useTimezone()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado'
      case 'completed': return 'Finalizado'
      case 'cancelled': return 'Cancelado'
      default: return 'Agendado'
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed': return 'default'
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(appointment.status)}
              <div>
                <h3 className="font-medium">{appointment.client?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {appointment.service?.name} • {appointment.professional?.name}
                </p>
              </div>
              <Badge variant={getStatusVariant(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(appointment.datetime, { format: 'time' })}
              </div>
              <div>
                Duração: {appointment.service?.duration || 60}min
              </div>
              <div>
                {formatCurrency(appointment.service?.price || 0)}
              </div>
            </div>

            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{appointment.notes}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 ml-4">
            {appointment.status === 'scheduled' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConfirm}
                  title="Confirmar agendamento"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  title="Cancelar agendamento"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
            
            {appointment.status === 'confirmed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onComplete}
                title="Finalizar agendamento"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(appointment)}
              title="Editar agendamento"
            >
              <Edit3 className="h-3 w-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              title="Excluir agendamento"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Página principal com Provider e Error Boundary
export default function AgendaPage() {
  return (
    <ErrorBoundary>
      <AgendaProvider>
        <AgendaPageContent />
      </AgendaProvider>
    </ErrorBoundary>
  )
}
