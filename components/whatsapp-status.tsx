"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import { useWhatsAppMessages } from "@/hooks/use-whatsapp-messages"

interface WhatsAppMessage {
  id: string
  clientName: string
  clientPhone: string
  message: string
  type: "confirmation" | "reminder" | "reactivation" | "custom"
  status: "pending" | "sent" | "delivered" | "read" | "failed"
  sentAt: Date
  createdAt: Date
  source: "whatsapp_logs" | "appointment_reminders"
}

export function WhatsAppStatus() {
  // Usar o hook dedicado para buscar mensagens reais do banco
  const { messages, stats, loading, error, fetchMessages } = useWhatsAppMessages()

  useEffect(() => {
    // Buscar mensagens ao carregar o componente
    fetchMessages()
  }, [fetchMessages])

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
    // Para mensagens reais, não podemos simular retry
    // Em vez disso, vamos apenas recarregar os dados
    fetchMessages()
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="w-6 h-6 animate-spin text-blue-400 mr-2" />
              <span className="text-gray-400">Carregando mensagens...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 mb-2">Erro ao carregar mensagens</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <Button 
                  onClick={fetchMessages}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Nenhuma mensagem encontrada</p>
                <p className="text-gray-500 text-sm">As mensagens enviadas aparecerão aqui</p>
              </div>
            </div>
          ) : (
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
                        {/* Mostrar apenas badge "Enviada" quando status for "sent" */}
                        {message.status === "sent" && (
                          <Badge className={getStatusColor(message.status)}>
                            {getStatusIcon(message.status)}
                            Enviada
                          </Badge>
                        )}
                        {/* Badge para outros status se necessário */}
                        {message.status === "failed" && (
                          <Badge className={getStatusColor(message.status)}>
                            {getStatusIcon(message.status)}
                            Falhou
                          </Badge>
                        )}
                        {message.status === "pending" && (
                          <Badge className={getStatusColor(message.status)}>
                            {getStatusIcon(message.status)}
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{message.clientPhone}</p>
                      <p className="text-sm text-gray-300 truncate max-w-md">{message.message}</p>
                      {message.sentAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Enviada: {message.sentAt.toLocaleString("pt-BR")}
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
                      Recarregar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
