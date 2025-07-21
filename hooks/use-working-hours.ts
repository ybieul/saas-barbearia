"use client"

import { useState, useEffect } from 'react'

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
      console.log('Horários carregados:', data.workingHours)
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

  return {
    workingHours,
    loading,
    error,
    fetchWorkingHours,
    updateWorkingHours,
  }
}
