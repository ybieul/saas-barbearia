"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import { useWhatsAppMessages } from "@/hooks/use-whatsapp-messages"
import { formatBrazilTime } from "@/lib/timezone"

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
        return <Clock className="w-3 h-3 text-tymer-icon" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "delivered":
        return "bg-tymer-accent/20 text-tymer-accent border-tymer-accent/30"
      case "read":
        return "bg-tymer-accent/20 text-tymer-accent border-tymer-accent/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-tymer-icon/20 text-tymer-icon border-tymer-icon/30"
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
    <Card className="bg-tymer-card/50 border-tymer-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-tymer-card/50 border-tymer-border">
          <CardContent className="p-4 text-center">
      <div className="text-2xl font-bold text-tymer-icon">{stats.sent}</div>
            <div className="text-xs text-gray-400">Enviadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card className="bg-tymer-card/50 border-tymer-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-tymer-icon" />
            <span className="text-lg sm:text-xl">Mensagens Enviadas Recentemente</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm sm:text-base">
            Status das mensagens enviadas nas últimas 24 horas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-tymer-icon mr-2" />
              <span className="text-gray-400 text-sm sm:text-base">Carregando mensagens...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="text-center px-4">
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 mb-2 text-sm sm:text-base">Erro ao carregar mensagens</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">{error}</p>
                <Button 
                  onClick={fetchMessages}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="text-center px-4">
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm sm:text-base">Nenhuma mensagem encontrada</p>
                <p className="text-gray-500 text-xs sm:text-sm">As mensagens enviadas aparecerão aqui</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start sm:items-center justify-between p-3 sm:p-4 bg-tymer-card/30 rounded-lg border border-tymer-border"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-tymer-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <p className="text-white font-medium text-sm sm:text-base truncate">{message.clientName}</p>
                        {/* Mostrar apenas badge "Enviada" quando status for "sent" */}
                        {message.status === "sent" && (
                          <Badge className={`${getStatusColor(message.status)} flex-shrink-0 text-xs`}>
                            {getStatusIcon(message.status)}
                            Enviada
                          </Badge>
                        )}
                        {/* Badge para outros status se necessário */}
                        {message.status === "failed" && (
                          <Badge className={`${getStatusColor(message.status)} flex-shrink-0 text-xs`}>
                            {getStatusIcon(message.status)}
                            Falhou
                          </Badge>
                        )}
                        {message.status === "pending" && (
                          <Badge className={`${getStatusColor(message.status)} flex-shrink-0 text-xs`}>
                            {getStatusIcon(message.status)}
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">{message.clientPhone}</p>
                      <p className="text-sm text-gray-300 truncate sm:whitespace-normal sm:break-words max-w-full pr-4">
                        {message.message}
                      </p>
                      {message.sentAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Enviada: {formatBrazilTime(message.sentAt, 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  {message.status === "failed" && (
                    <Button
                      size="sm"
                      onClick={() => retryFailedMessage(message.id)}
                      className="bg-red-500 hover:bg-red-600 text-white flex-shrink-0 ml-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Recarregar</span>
                      <span className="sm:hidden">Retry</span>
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
