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
  reason: string
}

export interface ProfessionalDaySchedule {
  start: string
  end: string
  breaks: ProfessionalBreak[]
}

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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar horários do profissional')
      }

      const data = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 API Response - Horários do profissional carregados:', data)
      }
      
      setSchedule(data.professional)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar horários do profissional:', err)
      }
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
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch(`/api/professionals/${id}/working-hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workingDays,
          workingHours
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar horários do profissional')
      }

      const data = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('Horários do profissional atualizados:', data.professional)
      }
      
      setSchedule(data.professional)
      return data.professional
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar horários do profissional:', err)
      }
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
