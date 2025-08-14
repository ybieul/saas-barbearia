"use client"

import { useState, useEffect } from 'react'

export interface ProfessionalWorkingDays {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export interface ProfessionalBreak {
  start: string
  end: string
  label: string // Alterado de 'reason' para 'label' para melhor UX
}

export interface ProfessionalDaySchedule {
  start: string
  end: string
  breaks: ProfessionalBreak[]
}

// Função auxiliar para criar horário padrão para um dia
export const createDefaultDaySchedule = (): ProfessionalDaySchedule => ({
  start: "08:00",
  end: "18:00", 
  breaks: []
})

// Função auxiliar para criar todos os dias com horários padrão
export const createDefaultWorkingHours = (): ProfessionalWorkingHours => ({
  monday: createDefaultDaySchedule(),
  tuesday: createDefaultDaySchedule(),
  wednesday: createDefaultDaySchedule(),
  thursday: createDefaultDaySchedule(),
  friday: createDefaultDaySchedule(),
  saturday: createDefaultDaySchedule(),
  sunday: createDefaultDaySchedule(),
})

export interface ProfessionalWorkingHours {
  monday: ProfessionalDaySchedule
  tuesday: ProfessionalDaySchedule
  wednesday: ProfessionalDaySchedule
  thursday: ProfessionalDaySchedule
  friday: ProfessionalDaySchedule
  saturday: ProfessionalDaySchedule
  sunday: ProfessionalDaySchedule
}

export interface ProfessionalSchedule {
  id: string
  name: string
  workingDays: ProfessionalWorkingDays
  workingHours: ProfessionalWorkingHours
}

export function useProfessionalSchedule(professionalId?: string) {
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfessionalSchedule = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 [DEBUG HOOK] ========== FETCH SCHEDULE ==========')
      console.log('🔍 [DEBUG HOOK] Carregando horários para profissional ID:', id)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch(`/api/professionals/${id}/working-hours`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('🔍 [DEBUG HOOK] GET Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [DEBUG HOOK] Erro no GET:', errorData)
        throw new Error(errorData.message || 'Erro ao buscar horários do profissional')
      }

      const data = await response.json()
      console.log('🔍 [DEBUG HOOK] Dados carregados do GET:', data)
      console.log('🔍 [DEBUG HOOK] Professional data:', data.professional)
      console.log('🔍 [DEBUG HOOK] workingDays carregados:', data.professional?.workingDays)
      console.log('🔍 [DEBUG HOOK] workingHours carregados:', data.professional?.workingHours)
      
      setSchedule(data.professional)
    } catch (err) {
      console.error('❌ [DEBUG HOOK] Erro ao buscar horários:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const updateProfessionalSchedule = async (
    id: string, 
    workingDays?: ProfessionalWorkingDays, 
    workingHours?: ProfessionalWorkingHours
  ) => {
    try {
      setError(null)
      
      console.log('🔍 [DEBUG HOOK] ========== INÍCIO UPDATE ==========')
      console.log('🔍 [DEBUG HOOK] Profissional ID:', id)
      console.log('🔍 [DEBUG HOOK] workingDays recebidos:', workingDays)
      console.log('🔍 [DEBUG HOOK] workingHours recebidos:', workingHours)
      console.log('🔍 [DEBUG HOOK] Tipos:', {
        workingDays: typeof workingDays,
        workingHours: typeof workingHours
      })
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const payload = { workingDays, workingHours }
      console.log('🔍 [DEBUG HOOK] Payload antes do stringify:', payload)
      console.log('🔍 [DEBUG HOOK] Payload JSON:', JSON.stringify(payload, null, 2))

      const response = await fetch(`/api/professionals/${id}/working-hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('🔍 [DEBUG HOOK] Response status:', response.status)
      console.log('🔍 [DEBUG HOOK] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [DEBUG HOOK] Erro na response:', errorData)
        throw new Error(errorData.message || 'Erro ao atualizar horários do profissional')
      }

      const data = await response.json()
      console.log('✅ [DEBUG HOOK] Dados recebidos de volta:', data)
      console.log('✅ [DEBUG HOOK] Professional updated:', data.professional)
      
      setSchedule(data.professional)
      return data.professional
    } catch (err) {
      console.error('❌ [DEBUG HOOK] Erro ao atualizar horários:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    }
  }

  // Buscar horários quando professionalId muda
  useEffect(() => {
    if (professionalId) {
      fetchProfessionalSchedule(professionalId)
    }
  }, [professionalId])

  // Função para verificar se um profissional trabalha em um dia específico
  const isProfessionalAvailableOnDay = (date: Date): boolean => {
    if (!schedule) return false

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = daysOfWeek[date.getDay()] as keyof ProfessionalWorkingDays
    
    return schedule.workingDays[dayName] || false
  }

  // Função para obter horários de trabalho de um dia específico
  const getProfessionalScheduleForDay = (date: Date) => {
    if (!schedule) return null

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = daysOfWeek[date.getDay()] as keyof ProfessionalWorkingHours
    
    if (!schedule.workingDays[dayName]) {
      return null // Profissional não trabalha neste dia
    }

    return schedule.workingHours[dayName]
  }

  // Função para verificar se um horário específico está disponível (considerando intervalos)
  const isProfessionalAvailableAtTime = (date: Date, time: string): boolean => {
    const daySchedule = getProfessionalScheduleForDay(date)
    if (!daySchedule) return false

    // Converter tempo para minutos
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }

    const timeMinutes = timeToMinutes(time)
    const startMinutes = timeToMinutes(daySchedule.start)
    const endMinutes = timeToMinutes(daySchedule.end)

    // Verificar se está dentro do horário de trabalho
    if (timeMinutes < startMinutes || timeMinutes >= endMinutes) {
      return false
    }

    // Verificar se não está em um intervalo
    for (const breakItem of daySchedule.breaks) {
      const breakStartMinutes = timeToMinutes(breakItem.start)
      const breakEndMinutes = timeToMinutes(breakItem.end)
      
      if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
        return false // Está em um intervalo
      }
    }

    return true
  }

  return {
    schedule,
    loading,
    error,
    fetchProfessionalSchedule,
    updateProfessionalSchedule,
    isProfessionalAvailableOnDay,
    getProfessionalScheduleForDay,
    isProfessionalAvailableAtTime
  }
}
