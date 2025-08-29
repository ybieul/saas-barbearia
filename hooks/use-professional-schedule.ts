import { useState, useCallback, useEffect } from 'react'
import { useApi } from './use-api'
import type { ProfessionalScheduleData } from '@/lib/types/schedule'

// Resposta da API
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

// Formato interno do hook (igual ao useWorkingHours)
export interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isActive: boolean
  startTime: string
  endTime: string
  breaks: Array<{
    startTime: string
    endTime: string
  }>
}

const DAYS_OF_WEEK: Pick<DaySchedule, 'dayOfWeek' | 'dayName'>[] = [
  { dayOfWeek: 1, dayName: 'Segunda-feira' },
  { dayOfWeek: 2, dayName: 'Terça-feira' },
  { dayOfWeek: 3, dayName: 'Quarta-feira' },
  { dayOfWeek: 4, dayName: 'Quinta-feira' },
  { dayOfWeek: 5, dayName: 'Sexta-feira' },
  { dayOfWeek: 6, dayName: 'Sábado' },
  { dayOfWeek: 0, dayName: 'Domingo' }
]

const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '18:00'

export function useProfessionalSchedule(professionalId?: string) {
  const { request } = useApi()
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Converter resposta da API para formato interno
  const convertToInternalFormat = (apiResponse: ProfessionalScheduleResponse | null): DaySchedule[] => {
    if (!apiResponse) {
      return DAYS_OF_WEEK.map(day => ({
        ...day,
        isActive: false,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        breaks: []
      }))
    }

    return DAYS_OF_WEEK.map(day => {
      const existingSchedule = apiResponse.schedule.find(s => s.dayOfWeek === day.dayOfWeek)
      return {
        ...day,
        isActive: existingSchedule?.isWorking || false,
        startTime: existingSchedule?.startTime?.substring(0, 5) || DEFAULT_START_TIME,
        endTime: existingSchedule?.endTime?.substring(0, 5) || DEFAULT_END_TIME,
        breaks: existingSchedule?.breaks?.map(breakItem => ({
          startTime: breakItem.startTime.substring(0, 5),
          endTime: breakItem.endTime.substring(0, 5)
        })) || []
      }
    })
  }

  // Carregar horários (igual ao fetchWorkingHours)
  const fetchSchedules = useCallback(async () => {
    if (!professionalId || professionalId === 'establishment') {
      // Inicializar com padrão vazio
      const defaultSchedules = DAYS_OF_WEEK.map(day => ({
        ...day,
        isActive: false,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        breaks: []
      }))
      setSchedules(defaultSchedules)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await request(`/api/professionals/${professionalId}/schedules`)
      const scheduleData = convertToInternalFormat(response as ProfessionalScheduleResponse)
      setSchedules(scheduleData)
      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar horários')
      setIsLoading(false)
      
      // Em caso de erro, usar padrão
      const defaultSchedules = DAYS_OF_WEEK.map(day => ({
        ...day,
        isActive: false,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        breaks: []
      }))
      setSchedules(defaultSchedules)
    }
  }, [professionalId, request])

  // Atualizar horários (igual ao updateWorkingHours)
  const updateSchedules = useCallback(async (updatedSchedules: DaySchedule[]): Promise<DaySchedule[]> => {
    if (!professionalId) {
      throw new Error('Professional ID não encontrado')
    }

    setError(null)
    setIsLoading(true)

    try {
      // Converter para formato da API
      const apiData: ProfessionalScheduleData[] = updatedSchedules
        .filter(schedule => schedule.isActive)
        .map(schedule => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breaks: schedule.breaks
        }))

      await request(`/api/professionals/${professionalId}/schedules`, {
        method: 'PUT',
        body: JSON.stringify(apiData)
      })

      // CRÍTICO: Atualizar estado interno após sucesso (igual ao useWorkingHours)
      setSchedules(updatedSchedules)
      setIsLoading(false)
      return updatedSchedules
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar horários')
      setIsLoading(false)
      throw err
    }
  }, [professionalId, request])

  // Carregar automaticamente quando professionalId muda (igual ao useWorkingHours)
  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  return {
    schedules, // Estado interno (igual ao workingHours do useWorkingHours)
    loading: isLoading,
    error,
    updateSchedules,
    refetch: fetchSchedules
  }
}
