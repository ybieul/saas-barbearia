"use client"

import { useState, useEffect, useCallback } from "react"

export interface WhatsAppStats {
  mensagensHoje: {
    total: number
    confirmacoes: number
    lembretes: number
    descricao: string
  }
  taxaEntrega: {
    taxa: number
    entregues: number
    total: number
    descricao: string
  }
  reducaoFaltas: {
    taxa: number
    baseadoEm: number
    descricao: string
  }
  clientesInativos: {
    total: number
    descricao: string
  }
}

export function useWhatsAppStats() {
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('📊 [Hook] Carregando estatísticas WhatsApp...')
      
      // Obter token do localStorage
      const token = localStorage.getItem('auth_token')
      console.log('🔍 [Hook] Token encontrado:', token ? '✅ Sim' : '❌ Não')

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/whatsapp/stats', { headers })
      console.log('📊 [Hook] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 [Hook] Estatísticas carregadas:', data)
        setStats(data)
      } else {
        const errorData = await response.text()
        console.error('❌ [Hook] Erro ao carregar estatísticas:', response.status, errorData)
        throw new Error(`Erro ${response.status}: ${errorData}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ [Hook] Erro ao carregar estatísticas WhatsApp:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
    clearError: () => setError(null)
  }
}
