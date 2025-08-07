"use client"

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTimezone } from "@/hooks/use-timezone"
import { logger } from "@/lib/logger"

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (appointmentData: any) => Promise<boolean>
  professionals: Array<{ id: string; name: string; isActive: boolean }>
  services: Array<{ id: string; name: string; duration: number; price: number; isActive: boolean }>
  clients: Array<{ id: string; name: string; phone: string; email?: string }>
  selectedDate: string
  mode: 'create' | 'edit'
  initialData?: any
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  professionals,
  services,
  clients,
  selectedDate,
  mode,
  initialData
}: AppointmentModalProps) {
  const { convertDate, formatDate, createBrazilDate, toUTC } = useTimezone()
  
  const [formData, setFormData] = useState({
    clientId: '',
    professionalId: '',
    serviceId: '',
    date: '',
    time: '',
    notes: ''
  })
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // Resetar formulário quando modal abrir/fechar
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        const appointmentDate = convertDate(initialData.datetime)
        setFormData({
          clientId: initialData.clientId || '',
          professionalId: initialData.professionalId || '',
          serviceId: initialData.serviceId || '',
          date: appointmentDate ? formatDate(appointmentDate.brazil, { format: 'date' }) : '',
          time: appointmentDate ? formatDate(appointmentDate.brazil, { format: 'time' }) : '',
          notes: initialData.notes || ''
        })
      } else {
        const selectedDateObj = convertDate(selectedDate)
        setFormData({
          clientId: '',
          professionalId: '',
          serviceId: '',
          date: selectedDateObj ? formatDate(selectedDateObj.brazil, { format: 'date' }) : '',
          time: '',
          notes: ''
        })
      }
      setValidationError(null)
    }
  }, [isOpen, mode, initialData, selectedDate, convertDate, formatDate])

  // Carregar horários disponíveis quando profissional, data ou serviço mudarem
  useEffect(() => {
    if (formData.professionalId && formData.date && formData.serviceId) {
      loadAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [formData.professionalId, formData.date, formData.serviceId])

  const loadAvailableSlots = async () => {
    setIsLoadingSlots(true)
    setAvailableSlots([])
    
    try {
      const selectedService = services.find(s => s.id === formData.serviceId)
      if (!selectedService) return

      // Converter data para UTC para enviar à API
      const dateUTC = toUTC(`${formData.date}T00:00:00`)
      if (!dateUTC) throw new Error('Data inválida')

      const response = await fetch('/api/appointments/available-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateUTC.toISOString(),
          professionalId: formData.professionalId,
          serviceDuration: selectedService.duration,
          excludeAppointmentId: mode === 'edit' ? initialData?.id : undefined
        })
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const slots = await response.json()
      setAvailableSlots(slots || [])
      
      logger.info('Horários disponíveis carregados', {
        date: formData.date,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId,
        slotsCount: slots?.length || 0
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar horários'
      logger.error('Falha ao carregar horários disponíveis', {
        error: errorMessage,
        professionalId: formData.professionalId,
        date: formData.date,
        serviceId: formData.serviceId
      })
      
      setValidationError('Não foi possível carregar os horários disponíveis. Tente novamente.')
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setValidationError(null)
    
    // Limpar horário quando dados importantes mudarem
    if (['professionalId', 'serviceId', 'date'].includes(field)) {
      setFormData(prev => ({ ...prev, time: '' }))
    }
  }, [])

  const validateForm = useCallback((): string | null => {
    if (!formData.clientId) return 'Selecione um cliente'
    if (!formData.professionalId) return 'Selecione um profissional'
    if (!formData.serviceId) return 'Selecione um serviço'
    if (!formData.date) return 'Selecione uma data'
    if (!formData.time) return 'Selecione um horário'

    // Verificar se é uma data futura (exceto para edição no mesmo dia)
    const appointmentDate = new Date(`${formData.date}T${formData.time}`)
    const now = new Date()
    
    if (mode === 'create' && appointmentDate < now) {
      return 'Não é possível agendar para uma data/hora passada'
    }

    return null
  }, [formData, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar formulário
    const error = validateForm()
    if (error) {
      setValidationError(error)
      return
    }

    setIsSubmitting(true)
    setValidationError(null)

    try {
      // Criar objeto de agendamento com timezone correto
      const dateTimeString = `${formData.date}T${formData.time}`
      const utcDateTime = toUTC(dateTimeString)
      
      if (!utcDateTime) {
        throw new Error('Erro na conversão de data/hora')
      }

      const appointmentData = {
        clientId: formData.clientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId,
        datetime: utcDateTime.toISOString(),
        notes: formData.notes.trim() || undefined,
        status: 'scheduled'
      }

      logger.info('Enviando dados do agendamento', {
        mode,
        appointmentData,
        originalDateTime: dateTimeString,
        utcDateTime: utcDateTime.toISOString()
      })

      const success = await onSubmit(appointmentData)
      
      if (success) {
        onClose()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro no envio do formulário de agendamento', {
        error: errorMessage,
        formData,
        mode
      })
      
      setValidationError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  // Filtrar dados ativos
  const activeProfessionals = professionals.filter(p => p.isActive)
  const activeServices = services.filter(s => s.isActive)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifique os dados do agendamento existente.'
              : 'Preencha os dados para criar um novo agendamento.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Erro de validação */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => handleInputChange('clientId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} • {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label htmlFor="professional">Profissional *</Label>
            <Select
              value={formData.professionalId}
              onValueChange={(value) => handleInputChange('professionalId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {activeProfessionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label htmlFor="service">Serviço *</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => handleInputChange('serviceId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} • {service.duration}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              disabled={isSubmitting}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Horário */}
          <div className="space-y-2">
            <Label htmlFor="time">Horário *</Label>
            {isLoadingSlots ? (
              <div className="flex items-center gap-2 p-2 border rounded">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Carregando horários disponíveis...
                </span>
              </div>
            ) : availableSlots.length > 0 ? (
              <Select
                value={formData.time}
                onValueChange={(value) => handleInputChange('time', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : formData.professionalId && formData.date && formData.serviceId ? (
              <div className="p-2 border rounded text-sm text-muted-foreground">
                Nenhum horário disponível para esta data
              </div>
            ) : (
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                disabled={isSubmitting}
                placeholder="Selecione profissional, serviço e data primeiro"
              />
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={isSubmitting}
              placeholder="Observações adicionais (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.clientId || !formData.professionalId || !formData.serviceId || !formData.date || !formData.time}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {mode === 'edit' ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                mode === 'edit' ? 'Salvar Alterações' : 'Criar Agendamento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
