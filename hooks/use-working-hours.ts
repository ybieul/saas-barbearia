"use client"

import { useState, useEffect } from 'react'
import { getBrazilDayOfWeek, getBrazilDayNameEn, debugTimezone } from '@/lib/timezone'

export interface WorkingHours {
  id?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function useWorkingHours() {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkingHours = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch('/api/working-hours', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar horários')
      }

      const data = await response.json()
      console.log('🔍 API Response - Horários carregados:', {
        rawData: data,
        workingHours: data.workingHours,
        count: data.workingHours?.length || 0,
        firstItem: data.workingHours?.[0] || null
      })
      setWorkingHours(data.workingHours || [])
    } catch (err) {
      console.error('Erro ao buscar horários:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const updateWorkingHours = async (newWorkingHours: WorkingHours[]) => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('/api/working-hours', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workingHours: newWorkingHours 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar horários')
      }

      const data = await response.json()
      console.log('Horários atualizados:', data.workingHours)
      setWorkingHours(data.workingHours || [])
      
      return data.workingHours
    } catch (err) {
      console.error('Erro ao atualizar horários:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    }
  }

  useEffect(() => {
    fetchWorkingHours()
  }, [])

  // 🇧🇷 CORREÇÃO: Função para obter o nome do dia da semana em inglês usando timezone brasileiro
  const getDayName = (date: Date): string => {
    // Usar getBrazilDayNameEn diretamente para garantir consistência
    const dayName = getBrazilDayNameEn(date)
    
    console.log('🇧🇷 getDayName Debug CRÍTICO:', {
      originalDate: date.toString(),
      dayOfWeek: date.getDay(),
      dayNameBR: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
      dayNameEN: dayName,
      dayNameLowerCase: dayName.toLowerCase()
    })
    
    return dayName
  }

  // 🇧🇷 CORREÇÃO: Função para obter horários de funcionamento para um dia específico
  const getWorkingHoursForDay = (date: Date) => {
    try {
      const dayName = getDayName(date)
      
      console.log('🔍 DEBUG getWorkingHoursForDay CRÍTICO:', {
        inputDate: date.toString(),
        dayName,
        dayNameLower: dayName.toLowerCase(),
        workingHoursCount: workingHours.length,
        availableWorkingHours: workingHours.map(wh => ({
          dayOfWeek: wh.dayOfWeek,
          dayOfWeekLower: wh.dayOfWeek.toLowerCase(),
          isActive: wh.isActive,
          startTime: wh.startTime,
          endTime: wh.endTime,
          match: wh.dayOfWeek.toLowerCase() === dayName.toLowerCase(),
          strictMatch: wh.dayOfWeek === dayName.toLowerCase()
        }))
      })
      
      // 🚨 CORREÇÃO CRÍTICA: Verificar múltiplas variações de comparação
      const dayWorkingHours = workingHours.find(wh => {
        const whDayLower = (wh.dayOfWeek || '').toLowerCase().trim()
        const targetDayLower = (dayName || '').toLowerCase().trim()
        
        // Também testar se o banco tem dados em formato diferente
        const alternativeComparisons = [
          whDayLower === targetDayLower,
          wh.dayOfWeek === dayName,
          wh.dayOfWeek === dayName.toLowerCase(),
          wh.dayOfWeek.toLowerCase() === dayName.toLowerCase()
        ]
        
        const isActive = Boolean(wh.isActive)
        const hasMatch = alternativeComparisons.some(comp => comp === true)
        const finalMatch = hasMatch && isActive
        
        console.log(`🔍 Comparação detalhada:`, {
          whDayOfWeek: wh.dayOfWeek,
          whDayLower,
          targetDayName: dayName,
          targetDayLower,
          isActive,
          alternativeComparisons,
          hasMatch,
          finalMatch
        })
        
        return finalMatch
      })
      
      if (!dayWorkingHours) {
        return {
          isOpen: false,
          startTime: null,
          endTime: null,
          dayOfWeek: dayName
        }
      }
      
      return {
        isOpen: true,
        startTime: dayWorkingHours.startTime,
        endTime: dayWorkingHours.endTime,
        dayOfWeek: dayName,
        id: dayWorkingHours.id
      }
    } catch (error) {
      console.error('Erro ao obter horários do dia:', error)
      return {
        isOpen: false,
        startTime: null,
        endTime: null,
        dayOfWeek: getDayName(date)
      }
    }
  }

  // Função para verificar se o estabelecimento está aberto em determinado dia
  const isEstablishmentOpen = (date: Date): boolean => {
    try {
      const dayConfig = getWorkingHoursForDay(date)
      return dayConfig.isOpen
    } catch (error) {
      console.error('Erro ao verificar se estabelecimento está aberto:', error)
      return false // Em caso de erro, considerar fechado para segurança
    }
  }

  // Função para verificar se um horário específico está dentro do funcionamento
  const isTimeWithinWorkingHours = (date: Date, time: string): boolean => {
    try {
      const dayConfig = getWorkingHoursForDay(date)
      
      if (!dayConfig.isOpen || !dayConfig.startTime || !dayConfig.endTime) {
        return false
      }
      
      // Converter horários para minutos para comparação
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }
      
      const timeMinutes = timeToMinutes(time)
      const startMinutes = timeToMinutes(dayConfig.startTime)
      const endMinutes = timeToMinutes(dayConfig.endTime)
      
      return timeMinutes >= startMinutes && timeMinutes < endMinutes
    } catch (error) {
      console.error('Erro ao verificar horário de funcionamento:', error)
      return false
    }
  }

  // Função para obter todos os dias da semana com status
  const getAllDaysStatus = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const daysInPortuguese = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    
    return days.map((day, index) => {
      const dayConfig = workingHours.find(wh => 
        wh.dayOfWeek.toLowerCase() === day && wh.isActive
      )
      
      return {
        dayOfWeek: day,
        dayName: daysInPortuguese[index],
        isOpen: !!dayConfig,
        startTime: dayConfig?.startTime || null,
        endTime: dayConfig?.endTime || null
      }
    })
  }

  return {
    workingHours,
    loading,
    error,
    fetchWorkingHours,
    updateWorkingHours,
    getWorkingHoursForDay,
    isEstablishmentOpen,
    isTimeWithinWorkingHours,
    getAllDaysStatus,
    getDayName
  }
}
