import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface AvailabilityData {
  professional_id: string
  professional_name: string
  date: string
  available_times: string[]
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
}

interface UseAvailabilityReturn {
  availableTimes: string[]
  isLoadingTimes: boolean
  error: string | null
  fetchAvailability: (professionalId: string, date: string) => Promise<void>
  clearAvailability: () => void
}

export function useAvailability(): UseAvailabilityReturn {
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  const fetchAvailability = useCallback(async (professionalId: string, date: string) => {
    // Validar parâmetros
    if (!professionalId || !date) {
      setAvailableTimes([])
      setError('Profissional e data são obrigatórios')
      return
    }

    // Verificar se está autenticado
    if (!token) {
      setAvailableTimes([])
      setError('Usuário não autenticado')
      return
    }

    setIsLoadingTimes(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/availability?professional_id=${encodeURIComponent(professionalId)}&date=${encodeURIComponent(date)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
      }

      const data: AvailabilityData = await response.json()

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Horários disponíveis carregados:', {
          professional: data.professional_name,
          date: data.date,
          available_times: data.available_times,
          total_slots: data.available_times.length
        })
      }

      setAvailableTimes(data.available_times || [])
    } catch (error: any) {
      console.error('❌ Erro ao buscar disponibilidade:', error)
      setError(error.message || 'Erro ao buscar horários disponíveis')
      setAvailableTimes([])
    } finally {
      setIsLoadingTimes(false)
    }
  }, [token])

  const clearAvailability = useCallback(() => {
    setAvailableTimes([])
    setError(null)
    setIsLoadingTimes(false)
  }, [])

  return {
    availableTimes,
    isLoadingTimes,
    error,
    fetchAvailability,
    clearAvailability
  }
}
