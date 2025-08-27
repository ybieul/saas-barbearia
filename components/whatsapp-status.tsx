"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { useWhatsAppLogs } from "@/hooks/use-api"

interface WhatsAppMessage {
  id: string
  clientName: string
  clientPhone: string
  message: string
  type: "CONFIRMATION" | "REMINDER_24H" | "REMINDER_2H" | "REACTIVATION" | "PROMOTION" | "CUSTOM"
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
}

export function WhatsAppStatus() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  
  // ✅ USAR DADOS REAIS UNIFICADOS (whatsapp_logs + appointment_reminders)
  const { logs, stats, breakdown, loading, fetchLogs } = useWhatsAppLogs()

  useEffect(() => {
    // Buscar logs das últimas 24 horas
    fetchLogs({ hours: 24, limit: 50 })
    
    // ✅ ATUALIZAR AUTOMATICAMENTE A CADA 30 SEGUNDOS
    const interval = setInterval(() => {
      fetchLogs({ hours: 24, limit: 50 })
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLogs])

  useEffect(() => {
    if (logs && logs.length > 0) {
      // ✅ CONVERTER LOGS REAIS PARA FORMATO DO COMPONENTE
      const convertedMessages: WhatsAppMessage[] = logs.map((log) => {
        // Extrair nome do cliente do número de telefone ou da mensagem
        let clientName = 'Cliente'
        let clientPhone = log.to
        
        // Tentar extrair nome da mensagem se existir padrão "Olá *Nome*"
        const nameMatch = log.message.match(/Olá \*([^*]+)\*/)
        if (nameMatch) {
          clientName = nameMatch[1]
        }
        
        // Formatar telefone para exibição
        if (log.to.startsWith('55')) {
          const phone = log.to.replace('55', '')
          clientPhone = `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
        } else if (log.to === 'Não informado') {
          clientPhone = 'Não informado'
        }

        return {
          id: log.id,
          clientName,
          clientPhone,
          message: log.message,
          type: log.type,
          status: log.status,
          sentAt: log.sentAt ? new Date(log.sentAt) : undefined,
          deliveredAt: log.status === 'DELIVERED' || log.status === 'READ' ? new Date(log.createdAt) : undefined,
          readAt: log.status === 'READ' ? new Date(log.createdAt) : undefined,
        }
      })

      setMessages(convertedMessages)
    } else {
      setMessages([])
    }
  }, [logs])

  useEffect(() => {
    // ✅ USAR ESTATÍSTICAS REAIS DO BANCO
    // Já temos stats diretamente do hook, não precisamos de useState separado
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
        return <CheckCircle className="w-3 h-3 text-blue-400" />
      case "DELIVERED":
        return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "READ":
        return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "FAILED":
        return <XCircle className="w-3 h-3 text-red-400" />
      case "PENDING":
        return <Clock className="w-3 h-3 text-yellow-400" />
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "DELIVERED":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "READ":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CONFIRMATION":
        return "Confirmação"
      case "REMINDER_24H":
        return "Lembrete 24h"
      case "REMINDER_2H":
        return "Lembrete 2h"
      case "REACTIVATION":
        return "Reativação"
      case "PROMOTION":
        return "Promoção"
      case "CUSTOM":
        return "Personalizada"
      default:
        return "Desconhecida"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SENT":
        return "Enviada"
      case "DELIVERED":
        return "Entregue"
      case "READ":
        return "Lida"
      case "FAILED":
        return "Falhou"
      case "PENDING":
        return "Pendente"
      default:
        return "Desconhecido"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Mostrando dados reais do banco */}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                Mensagens WhatsApp Recentes
              </CardTitle>
              <CardDescription className="text-gray-400">
                Mensagens reais enviadas nas últimas 24 horas
                {breakdown && (
                  <span className="block text-xs mt-1 text-gray-500">
                    📊 {breakdown.whatsapp_logs} logs + {breakdown.appointment_reminders} lembretes
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs({ hours: 24, limit: 50 })}
              disabled={loading}
              className="border-gray-600 text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="w-6 h-6 animate-spin text-blue-400 mr-2" />
              <span className="text-gray-400">Carregando mensagens...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhuma mensagem encontrada nas últimas 24 horas</p>
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
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusIcon(message.status)}
                          <span className="ml-1">{getStatusLabel(message.status)}</span>
                        </Badge>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
