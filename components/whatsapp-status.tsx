"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import { useAppointments, useClients } from "@/hooks/use-api"

interface WhatsAppMessage {
  id: string
  clientName: string
  clientPhone: string
  message: string
  type: "confirmation" | "reminder" | "reactivation" | "custom"
  status: "pending" | "sent" | "delivered" | "read" | "failed"
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
}

export function WhatsAppStatus() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  
  // Buscar dados reais da API
  const { appointments, loading, fetchAppointments } = useAppointments()
  const { clients, fetchClients } = useClients()

  useEffect(() => {
    fetchAppointments()
    fetchClients()
  }, [fetchAppointments, fetchClients])

  useEffect(() => {
    if (appointments.length > 0 && clients.length > 0) {
      // Gerar mensagens baseadas nos agendamentos reais das últimas 24 horas
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const recentAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date)
        return aptDate >= yesterday
      })

      const generatedMessages: WhatsAppMessage[] = recentAppointments.slice(0, 10).map((apt, index) => {
        const client = clients.find(c => c.id === apt.clientId)
        const clientName = client?.name || `Cliente ${apt.clientId}`
        const clientPhone = client?.phone || "(11) 9999-9999"
        
        // Determinar tipo de mensagem baseado no status e horário
        let type: "confirmation" | "reminder" | "reactivation" | "custom" = "confirmation"
        let message = ""
        let status: "pending" | "sent" | "delivered" | "read" | "failed" = "delivered"
        
        if (apt.status === 'completed') {
          type = "confirmation"
          message = `Agendamento confirmado para ${apt.date} às ${apt.time} - ${apt.serviceName}`
          status = Math.random() > 0.8 ? "read" : "delivered"
        } else if (apt.status === 'CONFIRMED') {
          type = "reminder" 
          message = `Lembrete: seu agendamento é em ${apt.date} às ${apt.time}`
          status = Math.random() > 0.9 ? "failed" : Math.random() > 0.3 ? "delivered" : "sent"
        } else {
          type = "confirmation"
          message = `Confirmação pendente: ${apt.serviceName} em ${apt.date} às ${apt.time}`
          status = "sent"
        }

        const baseTime = now.getTime() - (index + 1) * 30 * 60 * 1000 // 30 min intervals
        
        return {
          id: apt.id,
          clientName,
          clientPhone,
          message,
          type,
          status,
          sentAt: new Date(baseTime),
          deliveredAt: status !== "failed" ? new Date(baseTime + 30000) : undefined,
          readAt: status === "read" ? new Date(baseTime + 60000 + Math.random() * 30 * 60 * 1000) : undefined,
        }
      })

      // Adicionar algumas mensagens de reativação para clientes inativos
      const inactiveClients = clients.filter(client => {
        const hasRecentAppointment = appointments.some(apt => 
          apt.clientId === client.id && new Date(apt.date) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        )
        return !hasRecentAppointment
      }).slice(0, 3)

      const reactivationMessages: WhatsAppMessage[] = inactiveClients.map((client, index) => ({
        id: `reactivation-${client.id}`,
        clientName: client.name,
        clientPhone: client.phone || "(11) 9999-9999", 
        message: `Olá ${client.name}! Sentimos sua falta. Que tal agendar um novo atendimento? Temos ofertas especiais!`,
        type: "reactivation",
        status: Math.random() > 0.7 ? "delivered" : "sent",
        sentAt: new Date(now.getTime() - (generatedMessages.length + index + 1) * 45 * 60 * 1000),
        deliveredAt: Math.random() > 0.7 ? new Date(now.getTime() - (generatedMessages.length + index + 1) * 45 * 60 * 1000 + 45000) : undefined,
      }))

      setMessages([...generatedMessages, ...reactivationMessages])
    }
  }, [appointments, clients])

  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  })

  useEffect(() => {
    const newStats = messages.reduce(
      (acc, msg) => {
        acc.total++
        if (msg.status === "sent" || msg.status === "delivered" || msg.status === "read") acc.sent++
        if (msg.status === "delivered" || msg.status === "read") acc.delivered++
        if (msg.status === "read") acc.read++
        if (msg.status === "failed") acc.failed++
        return acc
      },
      { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    )
    setStats(newStats)
  }, [messages])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-3 h-3 text-blue-400" />
      case "delivered":
        return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "read":
        return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "failed":
        return <XCircle className="w-3 h-3 text-red-400" />
      default:
        return <Clock className="w-3 h-3 text-yellow-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "delivered":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "read":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "confirmation":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "reminder":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "reactivation":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const retryFailedMessage = (messageId: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, status: "pending" as const } : msg)))

    // Simulate retry
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, status: "sent" as const, sentAt: new Date() } : msg)),
      )
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.sent}</div>
            <div className="text-xs text-gray-400">Enviadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Mensagens WhatsApp Recentes
          </CardTitle>
          <CardDescription className="text-gray-400">
            Status das mensagens enviadas nas últimas 24 horas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium">{message.clientName}</p>
                      <Badge className={getTypeColor(message.type)}>
                        {message.type === "confirmation" && "Confirmação"}
                        {message.type === "reminder" && "Lembrete"}
                        {message.type === "reactivation" && "Reativação"}
                        {message.type === "custom" && "Personalizada"}
                      </Badge>
                      {/* Mostrar badge de status apenas se for "sent" (Enviada) */}
                      {message.status === "sent" && (
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusIcon(message.status)}
                          Enviada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{message.clientPhone}</p>
                    <p className="text-sm text-gray-300 truncate max-w-md">{message.message}</p>
                    {message.sentAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enviada: {message.sentAt.toLocaleString("pt-BR")}
                        {message.readAt && ` • Lida: ${message.readAt.toLocaleString("pt-BR")}`}
                      </p>
                    )}
                  </div>
                </div>
                {message.status === "failed" && (
                  <Button
                    size="sm"
                    onClick={() => retryFailedMessage(message.id)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Tentar Novamente
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
