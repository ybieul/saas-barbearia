import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface AvailabilityMetadata {
  working_hours: {
    start_time: string
    end_time: string
    is_open: boolean
  } | null
  breaks: Array<{
    start_time: string
    end_time: string
    reason: string
  }>
  exceptions: Array<{
    id: string
    start_datetime: string
    end_datetime: string
    reason: string
    type: string
  }>
  appointments: number
  service_duration: number
}

interface AvailabilityResponse {
  professional_id: string
  professional_name: string
  date: string
  available_times: string[]
  metadata: AvailabilityMetadata
}

interface UseAvailabilityReturn {
  availableTimes: string[]
  isLoadingTimes: boolean
  error: string | null
  metadata: AvailabilityMetadata | null
  fetchAvailability: (professionalId: string, date: string, serviceDuration?: number) => Promise<void>
  clearAvailability: () => void
}

export function useAvailability(): UseAvailabilityReturn {
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<AvailabilityMetadata | null>(null)
  const { token } = useAuth()

  const fetchAvailability = useCallback(async (professionalId: string, date: string, serviceDuration?: number) => {
    // Debug log
    console.log('🎣 Hook - fetchAvailability chamado:', { professionalId, date, serviceDuration })

    // Validar parâmetros
    if (!professionalId || !date) {
      console.log('❌ Hook - Parâmetros inválidos:', { professionalId, date })
      setAvailableTimes([])
      setError('Profissional e data são obrigatórios')
      return
    }

    // Verificar se está autenticado
    if (!token) {
      console.log('❌ Hook - Usuário não autenticado')
      setAvailableTimes([])
      setError('Usuário não autenticado')
      return
    }

    setIsLoadingTimes(true)
    setError(null)

    try {
      // Construir URL com parâmetros corretos
      const params = new URLSearchParams({
        professionalId: professionalId,  // 🔧 CORREÇÃO: Usar camelCase
        date: date
      })
      
      // Adicionar duração do serviço se fornecida
      if (serviceDuration && serviceDuration > 0) {
        params.append('serviceDuration', serviceDuration.toString())  // 🔧 CORREÇÃO: Usar camelCase
      }

      console.log('📡 Hook - Fazendo requisição para:', `/api/availability?${params.toString()}`)

      const response = await fetch(
        `/api/availability?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      )

      console.log('📥 Hook - Resposta da API:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('❌ Hook - Erro na resposta:', errorData)
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
      }

      const data: AvailabilityResponse = await response.json()

      console.log('✅ Hook - Horários disponíveis carregados:', {
        professional: data.professional_name,
        date: data.date,
        available_times: data.available_times,
        total_slots: data.available_times?.length || 0,
        metadata: data.metadata
      })

      setAvailableTimes(data.available_times || [])
      setMetadata(data.metadata || null)
    } catch (error: any) {
      console.error('❌ Erro ao buscar disponibilidade:', error)
      setError(error.message || 'Erro ao buscar horários disponíveis')
      setAvailableTimes([])
      setMetadata(null)
    } finally {
      setIsLoadingTimes(false)
    }
  }, [token])

  const clearAvailability = useCallback(() => {
    console.log('🧹 Hook - Limpando disponibilidade')
    setAvailableTimes([])
    setError(null)
    setMetadata(null)
    setIsLoadingTimes(false)
  }, [])

  return {
    availableTimes,
    isLoadingTimes,
    error,
    metadata,
    fetchAvailability,
    clearAvailability
  }
}
