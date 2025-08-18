import { useState, useCallback } from 'react'
import { useApi } from './use-api'
import type { 
  ProfessionalScheduleData, 
  CreateScheduleExceptionData, 
  ScheduleExceptionData, 
  DayAvailability 
} from '@/lib/types/schedule'

export interface ProfessionalScheduleResponse {
  professionalId: string
  professionalName: string
  schedule: Array<{
    dayOfWeek: number
    startTime: string | null
    endTime: string | null
    isWorking: boolean
    breaks: Array<{
      startTime: string
      endTime: string
    }>
  }>
}

export function useProfessionalSchedule(professionalId?: string) {
  const { request } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar horários padrão do profissional
  const getSchedule = useCallback(async (id?: string): Promise<ProfessionalScheduleResponse | null> => {
    const targetId = id || professionalId
    if (!targetId) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await request(`/api/professionals/${targetId}/schedules`)
      setIsLoading(false)
      return response as ProfessionalScheduleResponse
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar horários')
      setIsLoading(false)
      return null
    }
  }, [professionalId, request])

  // Atualizar horários padrão do profissional
  const updateSchedule = useCallback(async (
    schedules: ProfessionalScheduleData[],
    id?: string
  ): Promise<boolean> => {
    const targetId = id || professionalId
    if (!targetId) return false

    setIsLoading(true)
    setError(null)

    try {
      await request(`/api/professionals/${targetId}/schedules`, {
        method: 'PUT',
        body: JSON.stringify(schedules)
      })
      setIsLoading(false)
      return true
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar horários')
      setIsLoading(false)
      return false
    }
  }, [professionalId, request])

  return {
    getSchedule,
    updateSchedule,
    isLoading,
    error
  }
}

export function useScheduleExceptions(professionalId?: string) {
  const { request } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar exceções por período
  const getExceptions = useCallback(async (
    startDate: string,
    endDate: string,
    id?: string
  ): Promise<ScheduleExceptionData[]> => {
    const targetId = id || professionalId
    if (!targetId) return []

    setIsLoading(true)
    setError(null)

    try {
      const response = await request(
        `/api/professionals/${targetId}/exceptions?start_date=${startDate}&end_date=${endDate}`
      )
      setIsLoading(false)
      return (response as any)?.exceptions || []
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar exceções')
      setIsLoading(false)
      return []
    }
  }, [professionalId, request])

  // Criar nova exceção
  const createException = useCallback(async (
    exceptionData: CreateScheduleExceptionData,
    id?: string
  ): Promise<ScheduleExceptionData | null> => {
    const targetId = id || professionalId
    if (!targetId) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await request(`/api/professionals/${targetId}/exceptions`, {
        method: 'POST',
        body: JSON.stringify(exceptionData)
      })
      setIsLoading(false)
      return (response as any)?.exception
    } catch (err: any) {
      setError(err.message || 'Erro ao criar bloqueio')
      setIsLoading(false)
      
      // Se há conflitos com agendamentos, retornar erro detalhado
      if (err.status === 409) {
        throw new Error(`Conflito com agendamentos: ${err.conflictingAppointments?.map((apt: any) => 
          `${apt.clientName} às ${new Date(apt.dateTime).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`
        ).join(', ')}`)
      }
      
      return null
    }
  }, [professionalId, request])

  // Deletar exceção
  const deleteException = useCallback(async (exceptionId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await request(`/api/exceptions/${exceptionId}`, {
        method: 'DELETE'
      })
      setIsLoading(false)
      return true
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar bloqueio')
      setIsLoading(false)
      return false
    }
  }, [request])

  return {
    getExceptions,
    createException,
    deleteException,
    isLoading,
    error
  }
}

export function useAvailability() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar disponibilidade de um profissional para uma data
  const getAvailability = useCallback(async (
    businessSlug: string,
    professionalId: string,
    date: string,
    serviceDuration: number = 30
  ): Promise<DayAvailability | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        professionalId,
        date,
        serviceDuration: serviceDuration.toString()
      })

      const response = await fetch(`/api/public/business/${businessSlug}/availability-v2?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar disponibilidade')
      }

      const data = await response.json()
      setIsLoading(false)
      return data as DayAvailability
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar disponibilidade')
      setIsLoading(false)
      return null
    }
  }, [])

  return {
    getAvailability,
    isLoading,
    error
  }
}

// Hook especializado para integração com a agenda
export function useProfessionalAvailability() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar slots disponíveis usando a API availability-v2
  const getAvailableSlots = useCallback(async (
    businessSlug: string,
    professionalId: string,
    date: string,
    serviceDuration: number = 30
  ): Promise<string[]> => {
    if (!businessSlug || !professionalId || !date) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('useProfessionalAvailability: Parâmetros inválidos', { businessSlug, professionalId, date })
      }
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        professionalId,
        date,
        serviceDuration: serviceDuration.toString()
      })

      const response = await fetch(`/api/public/business/${businessSlug}/availability-v2?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar disponibilidade')
      }

      const data = await response.json() as DayAvailability

      // Extrair apenas os horários disponíveis
      const availableSlots = data.slots
        .filter(slot => slot.available)
        .map(slot => slot.time)

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Slots obtidos via availability-v2:', {
          professionalId,
          date,
          totalSlots: data.slots.length,
          availableSlots: availableSlots.length,
          workingHours: data.workingHours,
          firstAvailable: availableSlots[0],
          lastAvailable: availableSlots[availableSlots.length - 1]
        })
      }

      setIsLoading(false)
      return availableSlots
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar slots disponíveis')
      setIsLoading(false)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro em useProfessionalAvailability:', err)
      }
      
      return []
    }
  }, [])

  // Verificar se um profissional trabalha em determinado dia
  const checkProfessionalWorksOnDate = useCallback(async (
    businessSlug: string,
    professionalId: string,
    date: string
  ): Promise<{ works: boolean; reason?: string; workingHours?: { startTime: string; endTime: string } }> => {
    if (!businessSlug || !professionalId || !date) {
      return { works: false, reason: 'Parâmetros inválidos' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        professionalId,
        date,
        serviceDuration: '30' // Valor padrão para verificar disponibilidade
      })

      const response = await fetch(`/api/public/business/${businessSlug}/availability-v2?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao verificar disponibilidade')
      }

      const data = await response.json() as DayAvailability

      setIsLoading(false)

      if (!data.workingHours) {
        return { 
          works: false, 
          reason: data.message || 'Profissional não trabalha neste dia'
        }
      }

      return {
        works: true,
        workingHours: data.workingHours
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar disponibilidade')
      setIsLoading(false)
      
      return { 
        works: false, 
        reason: err.message || 'Erro ao verificar disponibilidade' 
      }
    }
  }, [])

  return {
    getAvailableSlots,
    checkProfessionalWorksOnDate,
    isLoading,
    error
  }
}
