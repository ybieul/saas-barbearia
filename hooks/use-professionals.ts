import { useState, useEffect } from 'react'

interface Professional {
  id: string
  name: string
  email?: string
  phone?: string
  specialty?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface UseProfessionalsReturn {
  professionals: Professional[]
  loading: boolean
  error: string | null
  addProfessional: (data: Omit<Professional, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateProfessional: (id: string, data: Partial<Professional>) => Promise<boolean>
  removeProfessional: (id: string) => Promise<boolean>
  refreshProfessionals: () => Promise<void>
}

export function useProfessionals(): UseProfessionalsReturn {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfessionals = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/professionals')
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProfessionals(data.professionals || [])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar profissionais:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const addProfessional = async (professionalData: Omit<Professional, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/professionals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(professionalData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setProfessionals(prev => [data.professional, ...prev])
      return true
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao adicionar profissional:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao adicionar profissional')
      return false
    }
  }

  const updateProfessional = async (id: string, professionalData: Partial<Professional>): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/professionals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...professionalData })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setProfessionals(prev => 
        prev.map(p => p.id === id ? data.professional : p)
      )
      return true
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar profissional:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao atualizar profissional')
      return false
    }
  }

  const removeProfessional = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch(`/api/professionals?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      setProfessionals(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao remover profissional:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover profissional')
      return false
    }
  }

  const refreshProfessionals = async () => {
    await fetchProfessionals()
  }

  useEffect(() => {
    fetchProfessionals()
  }, [])

  return {
    professionals,
    loading,
    error,
    addProfessional,
    updateProfessional,
    removeProfessional,
    refreshProfessionals,
  }
}
