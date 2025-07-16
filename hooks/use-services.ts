import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface UseServicesReturn {
  services: Service[]
  loading: boolean
  error: string | null
  addService: (data: Omit<Service, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateService: (id: string, data: Partial<Service>) => Promise<boolean>
  removeService: (id: string) => Promise<boolean>
  refreshServices: () => Promise<void>
}

export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/services?active=true')
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setServices(data.services || [])
    } catch (err) {
      console.error('Erro ao buscar serviços:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const addService = async (serviceData: Omit<Service, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => [data.service, ...prev])
      return true
    } catch (err) {
      console.error('Erro ao adicionar serviço:', err)
      setError(err instanceof Error ? err.message : 'Erro ao adicionar serviço')
      return false
    }
  }

  const updateService = async (id: string, serviceData: Partial<Service>): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...serviceData })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => 
        prev.map(s => s.id === id ? data.service : s)
      )
      return true
    } catch (err) {
      console.error('Erro ao atualizar serviço:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar serviço')
      return false
    }
  }

  const removeService = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      setServices(prev => prev.filter(s => s.id !== id))
      return true
    } catch (err) {
      console.error('Erro ao remover serviço:', err)
      setError(err instanceof Error ? err.message : 'Erro ao remover serviço')
      return false
    }
  }

  const refreshServices = async () => {
    await fetchServices()
  }

  useEffect(() => {
    fetchServices()
  }, [])

  return {
    services,
    loading,
    error,
    addService,
    updateService,
    removeService,
    refreshServices,
  }
}
