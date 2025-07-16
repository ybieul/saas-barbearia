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
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { useProfessionals } from "@/hooks/use-api"
import { useAppointments, useClients, useServices } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState("todos")
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
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
  const { appointments, loading: appointmentsLoading, error: appointmentsError, fetchAppointments, createAppointment } = useAppointments()
  const { clients, loading: clientsLoading, error: clientsError, fetchClients } = useClients()
  const { services, loading: servicesLoading, error: servicesError, fetchServices } = useServices()
  const { professionals: professionalsData, loading: professionalsLoading } = useProfessionals()
  const { toast } = useToast()

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchAppointments()
    fetchClients()
    fetchServices()
  }, [fetchAppointments, fetchClients, fetchServices])

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

    if (!newAppointment.date || !newAppointment.time) {
      toast({
        title: "Erro",
        description: "Selecione data e horário",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Criar agendamento
  const handleCreateAppointment = async () => {
    if (!validateForm()) return

    setIsCreating(true)
    try {
      const appointmentData = {
        endUserId: newAppointment.endUserId,
        serviceId: newAppointment.serviceId,
        professionalId: newAppointment.professionalId || undefined,
        dateTime: `${newAppointment.date}T${newAppointment.time}:00`,
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

  // Filtrar agendamentos por data e profissional
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.dateTime).toDateString()
    const currentDateString = currentDate.toDateString()
    
    const matchesDate = appointmentDate === currentDateString
    const matchesProfessional = selectedProfessional === "todos" || 
                               appointment.professionalId === selectedProfessional
    
    return matchesDate && matchesProfessional
  })

  // Status do agendamento
  const getStatusBadge = (status: string) => {
    const statusMap = {
      SCHEDULED: { label: "Agendado", variant: "secondary" as const },
      CONFIRMED: { label: "Confirmado", variant: "default" as const },
      IN_PROGRESS: { label: "Em andamento", variant: "default" as const },
      COMPLETED: { label: "Concluído", variant: "secondary" as const },
      CANCELLED: { label: "Cancelado", variant: "destructive" as const },
      NO_SHOW: { label: "Não compareceu", variant: "destructive" as const },
    }
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const }
  }

  if (appointmentsLoading || clientsLoading || servicesLoading) {
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
      </div>

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
              <CardTitle className="text-[#ededed]">Novo Agendamento</CardTitle>
              <CardDescription className="text-[#a1a1aa]">
                Preencha os dados do agendamento
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
                        {service.name} - R$ {service.price?.toFixed(2)} ({service.duration}min)
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
                  <Input
                    id="time"
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    className="bg-[#18181b] border-[#27272a] text-[#ededed]"
                  />
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
                  resetForm()
                }}
                className="border-[#27272a] hover:bg-[#27272a]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateAppointment}
                disabled={!newAppointment.endUserId || !newAppointment.serviceId || !newAppointment.date || !newAppointment.time || isCreating}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                {isCreating ? "Criando..." : "Criar Agendamento"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
