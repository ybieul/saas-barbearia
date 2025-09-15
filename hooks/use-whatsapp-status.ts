"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'loading'

interface WhatsAppStatusData {
  connected: boolean
  instanceName?: string
  status?: string
  error?: string
}

export function useWhatsAppStatus() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading')
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()

  // Função para fazer chamada à API
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!user?.tenantId) {
      throw new Error('Usuário não autenticado')
    }

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

    const response = await fetch(`/api/tenants/${user.tenantId}/whatsapp/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Erro HTTP ${response.status}`)
    }

    return await response.json()
  }, [user?.tenantId])

  // Verificar status do WhatsApp
  const checkStatus = useCallback(async () => {
    try {
      setError(null)
      const data: WhatsAppStatusData = await apiCall('status')
      
      if (data.connected) {
        setConnectionStatus('connected')
        setInstanceName(data.instanceName || null)
      } else {
        setConnectionStatus('disconnected')
        setInstanceName(null)
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao verificar status do WhatsApp:', err)
      }
      setError(err.message)
      setConnectionStatus('error')
    }
  }, [apiCall])

  // Verificar status inicial
  useEffect(() => {
    if (user?.tenantId) {
      checkStatus()
    }
  }, [checkStatus, user?.tenantId])

  return {
    connectionStatus,
    instanceName,
    error,
    isConnected: connectionStatus === 'connected',
    isLoading: connectionStatus === 'loading',
    refetch: checkStatus,
  }
}
