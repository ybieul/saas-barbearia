import { useState, useCallback } from 'react'

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

interface WhatsAppStats {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  pending: number
}

interface UseWhatsAppMessagesResult {
  messages: WhatsAppMessage[]
  stats: WhatsAppStats
  loading: boolean
  error: string | null
  fetchMessages: () => Promise<void>
}

export function useWhatsAppMessages(): UseWhatsAppMessagesResult {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [stats, setStats] = useState<WhatsAppStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Obter token do localStorage
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('/api/whatsapp/messages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // 🇧🇷 As datas já vêm processadas corretamente da API via parseDatabaseDateTime
        const messagesWithDates = data.messages.map((msg: any) => ({
          ...msg,
          sentAt: msg.sentAt ? new Date(msg.sentAt) : null,
          createdAt: new Date(msg.createdAt)
        }))

        setMessages(messagesWithDates)
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Erro ao buscar mensagens')
      }
    } catch (err) {
      console.error('❌ Erro ao buscar mensagens WhatsApp:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      
      // Definir valores padrão em caso de erro
      setMessages([])
      setStats({
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        pending: 0
      })
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    messages,
    stats,
    loading,
    error,
    fetchMessages
  }
}
